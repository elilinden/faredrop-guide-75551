import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "FareGuardian Contact <alerts@updates.lovable.app>";
const contactRecipient = Deno.env.get("CONTACT_RECIPIENT") ?? "elilinden@gmail.com";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface ContactPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function successResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  let payload: ContactPayload;

  try {
    payload = await req.json();
  } catch (_error) {
    return errorResponse(400, "Invalid JSON body");
  }

  const firstName = payload.firstName?.trim();
  const lastName = payload.lastName?.trim();
  const email = payload.email?.trim();
  const message = payload.message?.trim();

  if (!firstName || !lastName || !email || !message) {
    return errorResponse(400, "Missing required fields");
  }

  if (!resend) {
    console.error("[contact-message] RESEND_API_KEY is not configured");
    return errorResponse(500, "Email service unavailable");
  }

  const escapedMessage = escapeHtml(message).replace(/\n/g, "<br/>");
  const escapedFirstName = escapeHtml(firstName);
  const escapedLastName = escapeHtml(lastName);
  const escapedEmail = escapeHtml(email);

  const html = `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 16px;">New Contact Request</h2>
      <p style="margin: 0 0 12px;">You received a new message from the FareGuardian contact form.</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px;"><strong>Name:</strong> ${escapedFirstName} ${escapedLastName}</p>
        <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${escapedEmail}">${escapedEmail}</a></p>
        <p style="margin: 0;"><strong>Message:</strong></p>
        <div style="margin-top: 8px; padding: 12px; background: #fff; border-radius: 6px; border: 1px solid #cbd5f5;">
          ${escapedMessage}
        </div>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: resendFromEmail,
      to: [contactRecipient],
      reply_to: email,
      subject: `New contact message from ${firstName} ${lastName}`,
      html,
      text: `Name: ${firstName} ${lastName}\nEmail: ${email}\n\nMessage:\n${message}`,
    });
  } catch (error) {
    console.error("[contact-message] Failed to send email", error);
    return errorResponse(500, "Failed to send message");
  }

  return successResponse({ success: true });
});
