import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmployeePlanningEmail } from "@/lib/planning-data";

export type PlanningEmailRecipient = {
  id: string;
  name: string;
  email: string;
};

export type PlanningEmailAudience = "employee" | "location";

export async function getEmployeeEmailRecipients(
  supabase: SupabaseClient,
): Promise<PlanningEmailRecipient[]> {
  const { data, error } = await supabase
    .from("spl_employees")
    .select("id, name, email, private_email, planning_email_is_private")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((r) => {
      const selectedEmail =
        getEmployeePlanningEmail({
          email: r.email,
          privateEmail: r.private_email,
          planningEmailIsPrivate: r.planning_email_is_private,
        }) ?? (typeof r.email === "string" ? r.email.trim() : "");
      return { id: r.id, name: r.name, email: selectedEmail };
    })
    .filter((r) => r.email.length > 0);
}

export async function getLocationEmailRecipients(
  supabase: SupabaseClient,
): Promise<PlanningEmailRecipient[]> {
  const { data, error } = await supabase
    .from("spl_locations")
    .select("id, name, email")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((r) => typeof r.email === "string" && r.email.trim().length > 0)
    .map((r) => ({ id: r.id, name: r.name, email: (r.email as string).trim() }));
}

export async function getDeliveredRecipientIds(
  supabase: SupabaseClient,
  weekStart: string,
  audience: PlanningEmailAudience,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("spl_planning_email_deliveries")
    .select("recipient_id")
    .eq("week_start", weekStart)
    .eq("audience", audience);
  if (error) {
    if (error.message.includes("spl_planning_email_deliveries")) {
      throw new Error(
        "E-mailwachtrij ontbreekt in de database. Voer in Supabase SQL Editor uit: supabase-planning-email-queue.sql",
      );
    }
    throw error;
  }
  return new Set((data ?? []).map((r) => r.recipient_id as string));
}
