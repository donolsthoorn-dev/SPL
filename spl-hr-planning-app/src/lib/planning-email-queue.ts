import type { SupabaseClient } from "@supabase/supabase-js";
import { getIsoWeekNumber } from "@/lib/publieke-planning-renderer";
import { sendSinglePlanningPublishEmail } from "@/lib/planning-email";
import {
  getDeliveredRecipientIds,
  getEmployeeEmailRecipients,
  getLocationEmailRecipients,
  type PlanningEmailAudience,
  type PlanningEmailRecipient,
} from "@/lib/planning-email-recipients";

export const EMAIL_QUEUE_CHUNK_SIZE = 10;

export type EmailDispatchMode = "full" | "catchup";

type DispatchRow = {
  id: string;
  week_start: string;
  audience: PlanningEmailAudience;
  mode: EmailDispatchMode;
  status: string;
  total_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
};

export type EmailDispatchStatus = {
  weekStart: string;
  audience: PlanningEmailAudience;
  eligibleCount: number;
  deliveredCount: number;
  catchupCount: number;
  activeDispatch: {
    id: string;
    status: string;
    total: number;
    sent: number;
    failed: number;
    pending: number;
  } | null;
};

export async function getEmailDispatchStatus(
  supabase: SupabaseClient,
  weekStart: string,
  audience: PlanningEmailAudience,
): Promise<EmailDispatchStatus> {
  const recipients =
    audience === "employee"
      ? await getEmployeeEmailRecipients(supabase)
      : await getLocationEmailRecipients(supabase);
  const deliveredIds = await getDeliveredRecipientIds(supabase, weekStart, audience);
  const deliveredCount = recipients.filter((r) => deliveredIds.has(r.id)).length;
  const catchupCount = recipients.length - deliveredCount;

  const { data: activeRows, error: activeErr } = await supabase
    .from("spl_planning_email_dispatches")
    .select("id, status, total_count, sent_count, failed_count")
    .eq("week_start", weekStart)
    .eq("audience", audience)
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (activeErr) throw activeErr;

  let activeDispatch: EmailDispatchStatus["activeDispatch"] = null;
  if (activeRows?.[0]) {
    const row = activeRows[0];
    const { count, error: pendingErr } = await supabase
      .from("spl_planning_email_queue")
      .select("id", { count: "exact", head: true })
      .eq("dispatch_id", row.id)
      .eq("status", "pending");
    if (pendingErr) throw pendingErr;
    activeDispatch = {
      id: row.id,
      status: row.status,
      total: row.total_count,
      sent: row.sent_count,
      failed: row.failed_count,
      pending: count ?? 0,
    };
  }

  return {
    weekStart,
    audience,
    eligibleCount: recipients.length,
    deliveredCount,
    catchupCount,
    activeDispatch,
  };
}

async function loadRecipients(
  supabase: SupabaseClient,
  audience: PlanningEmailAudience,
): Promise<PlanningEmailRecipient[]> {
  return audience === "employee"
    ? getEmployeeEmailRecipients(supabase)
    : getLocationEmailRecipients(supabase);
}

export async function createPlanningEmailDispatch(
  supabase: SupabaseClient,
  args: {
    weekStart: string;
    audience: PlanningEmailAudience;
    mode: EmailDispatchMode;
  },
): Promise<{
  dispatchId: string;
  total: number;
  skipped: number;
  pending: number;
}> {
  const allRecipients = await loadRecipients(supabase, args.audience);
  const deliveredIds = await getDeliveredRecipientIds(supabase, args.weekStart, args.audience);

  let toEnqueue: PlanningEmailRecipient[];
  let skipped: PlanningEmailRecipient[];

  toEnqueue = allRecipients.filter((r) => !deliveredIds.has(r.id));
  skipped = allRecipients.filter((r) => deliveredIds.has(r.id));

  if (!toEnqueue.length) {
    return { dispatchId: "", total: 0, skipped: skipped.length, pending: 0 };
  }

  const { data: dispatch, error: dispatchErr } = await supabase
    .from("spl_planning_email_dispatches")
    .insert({
      week_start: args.weekStart,
      audience: args.audience,
      mode: args.mode,
      status: "pending",
      total_count: toEnqueue.length,
      skipped_count: skipped.length,
    })
    .select("id")
    .single();
  if (dispatchErr) throw dispatchErr;

  const queueRows = toEnqueue.map((r) => ({
    dispatch_id: dispatch.id,
    recipient_id: r.id,
    recipient_name: r.name,
    email: r.email,
    status: "pending",
  }));

  const { error: queueErr } = await supabase.from("spl_planning_email_queue").insert(queueRows);
  if (queueErr) throw queueErr;

  return {
    dispatchId: dispatch.id,
    total: toEnqueue.length,
    skipped: skipped.length,
    pending: toEnqueue.length,
  };
}

async function refreshDispatchCounts(
  supabase: SupabaseClient,
  dispatchId: string,
): Promise<DispatchRow> {
  const { data: items, error } = await supabase
    .from("spl_planning_email_queue")
    .select("status")
    .eq("dispatch_id", dispatchId);
  if (error) throw error;

  const sent = (items ?? []).filter((i) => i.status === "sent").length;
  const failed = (items ?? []).filter((i) => i.status === "failed").length;
  const pending = (items ?? []).filter((i) => i.status === "pending").length;
  const status = pending === 0 ? "completed" : "processing";

  const { data: updated, error: updErr } = await supabase
    .from("spl_planning_email_dispatches")
    .update({
      sent_count: sent,
      failed_count: failed,
      status,
      updated_at: new Date().toISOString(),
      ...(pending === 0 ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", dispatchId)
    .select("*")
    .single();
  if (updErr) throw updErr;
  return updated as DispatchRow;
}

export async function processPlanningEmailDispatchChunk(
  supabase: SupabaseClient,
  dispatchId: string,
  chunkSize = EMAIL_QUEUE_CHUNK_SIZE,
): Promise<{
  dispatchId: string;
  processed: number;
  sent: number;
  failed: number;
  pending: number;
  total: number;
  failures: string[];
  done: boolean;
}> {
  const { data: dispatch, error: dispatchErr } = await supabase
    .from("spl_planning_email_dispatches")
    .select("*")
    .eq("id", dispatchId)
    .single();
  if (dispatchErr) throw dispatchErr;
  if (!dispatch) throw new Error("Dispatch niet gevonden.");

  if (dispatch.status === "completed" || dispatch.status === "cancelled") {
    return {
      dispatchId,
      processed: 0,
      sent: dispatch.sent_count,
      failed: dispatch.failed_count,
      pending: 0,
      total: dispatch.total_count,
      failures: [],
      done: true,
    };
  }

  await supabase
    .from("spl_planning_email_dispatches")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", dispatchId);

  const { data: pendingItems, error: pendingErr } = await supabase
    .from("spl_planning_email_queue")
    .select("id, recipient_id, recipient_name, email")
    .eq("dispatch_id", dispatchId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(chunkSize);
  if (pendingErr) throw pendingErr;

  const planTitle = `SPL planning week ${getIsoWeekNumber(dispatch.week_start)}`;
  const audience = dispatch.audience as PlanningEmailAudience;
  const failures: string[] = [];
  let chunkSent = 0;
  let chunkFailed = 0;

  for (const item of pendingItems ?? []) {
    try {
      const { providerMessageId } = await sendSinglePlanningPublishEmail({
        weekStart: dispatch.week_start,
        planTitle,
        notes: null,
        recipient: {
          id: item.recipient_id,
          name: item.recipient_name,
          email: item.email,
        },
        audience,
      });

      const sentAt = new Date().toISOString();
      const { error: itemErr } = await supabase
        .from("spl_planning_email_queue")
        .update({
          status: "sent",
          provider_message_id: providerMessageId ?? null,
          sent_at: sentAt,
        })
        .eq("id", item.id);
      if (itemErr) throw itemErr;

      const { error: deliveryErr } = await supabase.from("spl_planning_email_deliveries").upsert(
        {
          week_start: dispatch.week_start,
          audience,
          recipient_id: item.recipient_id,
          email: item.email,
          dispatch_id: dispatchId,
          delivered_at: sentAt,
        },
        { onConflict: "week_start,audience,recipient_id" },
      );
      if (deliveryErr) throw deliveryErr;

      chunkSent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${item.email}: ${message}`);
      await supabase
        .from("spl_planning_email_queue")
        .update({ status: "failed", error_message: message })
        .eq("id", item.id);
      chunkFailed += 1;
    }
  }

  const updated = await refreshDispatchCounts(supabase, dispatchId);
  const { count: pendingCount, error: countErr } = await supabase
    .from("spl_planning_email_queue")
    .select("id", { count: "exact", head: true })
    .eq("dispatch_id", dispatchId)
    .eq("status", "pending");
  if (countErr) throw countErr;

  const pending = pendingCount ?? 0;

  return {
    dispatchId,
    processed: (pendingItems ?? []).length,
    sent: updated.sent_count,
    failed: updated.failed_count,
    pending,
    total: updated.total_count,
    failures,
    done: pending === 0,
  };
}

/** Registreer eerdere succesvolle verzendingen (bijv. uit Resend-export) zonder opnieuw te mailen. */
export async function registerPlanningEmailDeliveries(
  supabase: SupabaseClient,
  args: {
    weekStart: string;
    audience: PlanningEmailAudience;
    recipientIds: string[];
  },
): Promise<{ registered: number }> {
  const recipients = await loadRecipients(supabase, args.audience);
  const byId = new Map(recipients.map((r) => [r.id, r]));
  const rows = args.recipientIds
    .map((id) => {
      const r = byId.get(id);
      if (!r) return null;
      return {
        week_start: args.weekStart,
        audience: args.audience,
        recipient_id: r.id,
        email: r.email,
        dispatch_id: null,
        delivered_at: new Date().toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!rows.length) return { registered: 0 };

  const { error } = await supabase
    .from("spl_planning_email_deliveries")
    .upsert(rows, { onConflict: "week_start,audience,recipient_id" });
  if (error) throw error;
  return { registered: rows.length };
}
