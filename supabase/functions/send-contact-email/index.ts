import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape to prevent injection into email template
const esc = (s: string) =>
  s.replace(/&/g, "&amp;")
   .replace(/</g, "&lt;")
   .replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;")
   .replace(/'/g, "&#x27;");

// Server-side email format validation
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Simple in-memory rate limiter: max 5 requests per IP per minute
const ipCallMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCallMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCallMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { name, organisation, email, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, email, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side email format validation
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitise all user-supplied fields before interpolation
    const safeName = esc(String(name).slice(0, 200));
    const safeOrg = organisation ? esc(String(organisation).slice(0, 200)) : "";
    const safeEmail = esc(String(email).slice(0, 320));
    const safeMessage = esc(String(message).slice(0, 5000));

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Rootstory Contact Form <onboarding@resend.dev>",
        to: ["chinmaya@rootstory.io"],
        reply_to: email,
        subject: `New enquiry from ${safeName}${safeOrg ? ` — ${safeOrg}` : ""}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
            <h2 style="font-size: 22px; font-weight: 500; border-bottom: 1px solid #e0ddd8; padding-bottom: 12px; margin-bottom: 24px;">
              New Contact Enquiry
            </h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #888; width: 130px;">Name</td>
                <td style="padding: 8px 0; font-size: 15px;">${safeName}</td>
              </tr>
              ${safeOrg ? `
              <tr>
                <td style="padding: 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #888;">Organisation</td>
                <td style="padding: 8px 0; font-size: 15px;">${safeOrg}</td>
              </tr>` : ""}
              <tr>
                <td style="padding: 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #888;">Email</td>
                <td style="padding: 8px 0; font-size: 15px;"><a href="mailto:${safeEmail}" style="color: #b8860b;">${safeEmail}</a></td>
              </tr>
            </table>
            <div>
              <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #888; margin-bottom: 10px;">Message</p>
              <p style="font-size: 15px; line-height: 1.7; white-space: pre-wrap; background: #f7f5f0; padding: 16px 20px; border-left: 3px solid #b8860b; margin: 0;">${safeMessage}</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-contact-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
