// Deno Edge Function: admin-signup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Payload = {
  email?: string;
  password?: string;
  fullName?: string;
  full_name?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const password = payload.password ?? "";
  const fullName = (payload.fullName ?? payload.full_name ?? "").trim();

  if (!email || !password) {
    return json(400, { ok: false, error: "Email and password are required" });
  }

  if (password.length < 6) {
    return json(400, { ok: false, error: "Password must be at least 6 characters" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error("[admin-signup] Missing Supabase env vars");
    return json(500, { ok: false, error: "Server misconfigured" });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (error) {
    console.error("[admin-signup] createUser error:", error);
    return json(400, { ok: false, error: error.message });
  }

  return json(200, {
    ok: true,
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email,
        }
      : null,
  });
});
