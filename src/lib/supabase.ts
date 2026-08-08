import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// Server-only client. Uses the Supabase secret key — never import this file
// from a Client Component or expose the key to the browser.
export function getSupabaseServerClient() {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SECRET_KEY");
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
