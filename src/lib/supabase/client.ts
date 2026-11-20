import { createBrowserClient } from "@supabase/ssr";

function getSupabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseKey();
  return Boolean(
    url &&
      key &&
      !url.includes("your-project-id") &&
      !key.includes("your-supabase-anon-key")
  );
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    getSupabaseKey() || "placeholder-key"
  );
}
