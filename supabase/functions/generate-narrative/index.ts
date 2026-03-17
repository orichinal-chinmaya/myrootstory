import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildPrompt(answers: Record<string, unknown>): string {
  const a = answers;
  const scheme    = (a["S3"] as string)  || "a women's DBT scheme";
  const district  = (a["S1"] as string)  || "Maharashtra";
  const livelihood= (a["S5"] as string)  || "not specified";
  const fundUse   = Array.isArray(a["CQ-1"]) ? (a["CQ-1"] as string[]).join(", ") : ((a["CQ-1"] as string) || "not recorded");

  const depthMap: Record<string, string> = {
    "ES-3":"BEFORE THIS MONEY CAME", "ES-8":"THE MOMENT THINGS CHANGED",
    "ES-21":"HOW IT FEELS TO KNOW IT IS COMING",
    "ST-1":"IN MY OWN WORDS", "ST-4":"WHAT I WOULD LOSE IF IT STOPPED",
    "V-4":"ANYTHING ELSE I WANT TO SAY"
  };
  const depthLines = Object.entries(depthMap)
    .filter(([id]) => a[id] && String(a[id]).trim().length > 5)
    .map(([id, label]) => `[${label}]: "${a[id]}"`)
    .join("\n");

  return `You are writing a micronarrative for a social audit. The participant will hear this read back to them. It must feel like their own story — not a summary written about them.

STRICT RULES:
- Exactly 70–95 words. Count carefully. Do not exceed 95.
- First person ("I") — she is speaking, present tense where possible
- Use ONLY what is in the data below — no invented details, no embellishment
- Tone: clear, strong, self-assured — she is the agent of her own change
- No sentimental language. No "despite hardship" or "journey". No bureaucratic phrases.
- One paragraph only. No title.
- If she gave her own words (in quotes below), use them directly

WHAT SHE SHARED:
Location: ${district} | Scheme: ${scheme} | Livelihood: ${livelihood}
Used money for: ${fundUse}
Most important to her: "${a["CQ-2"] || ""}"
Expenses before → now: ${a["ES-1"] || "—"} → ${a["ES-2"] || "—"} | Stable: ${a["ES-4"] || "—"}
Pressure reduced: ${a["ES-7"] || "—"}
Borrowing: ${a["ES-9"] || "—"} → ${a["ES-10"] || "—"}
Confidence: ${a["WE-1"] || "—"}/5 → ${a["WE-2"] || "—"}
More say at home: ${a["WE-4"] || "—"} | Planning ahead: ${a["WE-5"] || "—"}
Saving: ${a["ES-17"] || "—"} | Asset: ${a["ES-18"] || "—"}
Food: ${a["CQ-4"] || "—"} | Health spend: ${a["CQ-3"] || "—"} | Education: ${a["CQ-5"] || "—"}
Self-worth: ${a["WE-10"] || "—"} | Banking: ${a["ES-19"] || "—"}
Independence: ${a["WE-12"] || "—"}
Community: ${a["CQ-11"] || "—"} | Supporting others: ${a["CQ-12"] || "—"}
${a["CQ-8"] ? `Livelihood income: ${a["CQ-8"]}` : ""}
${a["WE-7"] ? `Spending decisions: ${a["WE-7"]}` : ""}

HER EXACT WORDS (use these, do not paraphrase):
${depthLines || "(none recorded)"}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { answers } = await req.json();
    if (!answers) return new Response(JSON.stringify({ error: "answers required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = buildPrompt(answers);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Usage credits needed. Please add credits to your workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!text) throw new Error("Empty narrative returned");

    return new Response(JSON.stringify({ narrative: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-narrative error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
