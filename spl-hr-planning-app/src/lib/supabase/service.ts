import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side client met service role (RLS omzeilen). Alleen in route handlers gebruiken.
 * Vereist SUPABASE_SERVICE_ROLE_KEY in .env voor o.a. de openbare planning-link.
 */
export function createServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ontbreekt. Voeg deze toe aan .env.local (Supabase → Project Settings → API).",
    );
  }
  return createClient(url, key);
}
