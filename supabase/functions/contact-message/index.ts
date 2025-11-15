// Deno Edge Function: contact-message
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  let p: Payload;
  try {
    p = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const first = (p.firstName ?? "").trim();
  const last = (p.lastName ?? "").trim();
  const email = (p.email ?? "").trim();
  const msg = (p.message ?? "").trim();

  if (!first || !last || !email || !msg) {
    return json(400, { ok: false, error: "Missing required fields" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { ok: false, error: "Server not configured" });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // basic request context
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "";
  const ua = req.headers.get("user-agent") ?? "";

  const { data: row, error: insErr } = await sb
    .from("contact_messages")
    .insert({
      first_name: first,
      last_name: last,
      email,
      message: msg,
      ip,
      user_agent: ua,
    })
    .select("*")
    .single();

  if (insErr) {
    console.error("[contact-message] insert error:", insErr);
    return json(500, { ok: false, error: "Failed to save message" });
  }

  // Optional: email via Resend
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const CONTACT_TO = Deno.env.get("CONTACT_TO");       // e.g. support@fareguardian.com
  const CONTACT_FROM = Deno.env.get("CONTACT_FROM");   // e.g. "FareGuardian <no-reply@fareguardian.com>"

  if (RESEND_API_KEY && CONTACT_TO && CONTACT_FROM) {
    try {
      const body = {
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        subject: `New contact message from ${first} ${last}`,
        html: `
          <h3>New Contact Message</h3>
          <p><b>Name:</b> ${escapeHtml(first)} ${escapeHtml(last)}</p>
          <p><b>Email:</b> ${escapeHtml(email)}</p>
          <p><b>Message:</b><br/>${escapeHtml(msg).replace(/\n/g, "<br/>")}</p>
          <hr/>
          <p><small>IP: ${escapeHtml(ip || "n/a")}<br/>UA: ${escapeHtml(ua)}</small></p>
        `,
      };

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const t = await r.text();
        console.warn("[contact-message] Resend failed:", r.status, t);
        await sb.from("contact_messages")
          .update({ status: "saved_email_failed", error: t.slice(0, 500) })
          .eq("id", row.id);
      } else {
        await sb.from("contact_messages")
          .update({ status: "saved_emailed" })
          .eq("id", row.id);
      }
    } catch (e) {
      console.warn("[contact-message] Email exception:", e);
      await sb.from("contact_messages")
        .update({ status: "saved_email_failed", error: String(e).slice(0, 500) })
        .eq("id", row.id);
    }
  } else {
    await sb.from("contact_messages").update({ status: "saved" }).eq("id", row.id);
  }

  return json(200, { ok: true, id: row.id });
});
