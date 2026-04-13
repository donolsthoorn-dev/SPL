import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function requirePlanningApiUser(): Promise<
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Niet ingelogd" }, { status: 401 }) };
  }

  const { data: adminUser, error: adminErr } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminErr) {
    return { ok: false, response: NextResponse.json({ error: "Admincontrole mislukt" }, { status: 500 }) };
  }

  if (!adminUser) {
    return { ok: false, response: NextResponse.json({ error: "Geen admin" }, { status: 403 }) };
  }

  return { ok: true, supabase, user };
}
