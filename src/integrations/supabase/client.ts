import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof window !== "undefined" ? (window as any).__SUPABASE_URL__ : undefined);
const anon =
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof window !== "undefined" ? (window as any).__SUPABASE_ANON__ : undefined);

if (!url || !anon) {
  // Helpful console for troubleshooting in preview environments
  console.warn("Supabase env vars missing. URL:", url, " ANON:", anon ? "***" : "MISSING");
}

export const supabase = createClient<Database>(url!, anon!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
