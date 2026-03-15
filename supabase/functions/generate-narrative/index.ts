import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildPrompt(answers: Record<string, unknown>): string {
  const a = answers;
  const scheme    = (a["S8"] as string)  || "a women's DBT scheme";
  const district  = (a["S2"] as string)  || "Maharashtra";
  const livelihood= (a["S10"] as string) || "not specified";
  const fundUse   = Array.isArray(a["P1"]) ? (a["P1"] as string[]).join(", ") : ((a["P1"] as string) || "not recorded");

  const depthMap: Record<string, string> = {
    D1:"BEFORE THIS MONEY CAME", D2:"THE MOMENT THINGS CHANGED",
    D4:"HOW IT FEELS TO KNOW IT IS COMING",
    D6:"IN MY OWN WORDS", D7:"WHAT I WOULD LOSE IF IT STOPPED",
    V4:"ANYTHING ELSE I WANT TO SAY"
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
Most important to her: "${a["P2"] || ""}"
Expenses before → now: ${a["P3"] || "—"} → ${a["P4"] || "—"} | Stable: ${a["P5"] || "—"}
Pressure reduced: ${a["P8"] || "—"}
Borrowing: ${a["P9"] || "—"} → ${a["P10"] || "—"}
Confidence: ${a["P13"] || "—"}/5 → ${a["P14"] || "—"}
More say at home: ${a["P15"] || "—"} | Planning ahead: ${a["P16"] || "—"}
Saving: ${a["N1"] || "—"} | Asset: ${a["N2"] || "—"}
Food: ${a["N4"] || "—"} | Health spend: ${a["N3"] || "—"} | Education: ${a["N5"] || "—"}
Self-worth: ${a["N7"] || "—"} | Banking: ${a["N8"] || "—"}
Independence: ${a["N12"] || "—"}
Community: ${a["CS1"] || "—"} | Supporting others: ${a["CS3"] || "—"}
${a["A4b"] ? `Livelihood income: ${a["A4b"]}` : ""}
${a["A6b"] ? `Spending decisions: ${a["A6b"]}` : ""}

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
