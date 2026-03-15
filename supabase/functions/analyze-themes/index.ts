import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { narratives, mode, customPrompt } = await req.json();
    if (!narratives || !Array.isArray(narratives) || narratives.length === 0) {
      return new Response(JSON.stringify({ error: "narratives array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const narrativeBlock = narratives.map((n: string, i: number) => `[Story ${i + 1}]: ${n}`).join("\n\n");

    let systemPrompt: string;
    if (mode === "custom" && customPrompt) {
      systemPrompt = `You are a qualitative research analyst specialising in social policy and women's economic empowerment in rural India. Analyse the following first-person narratives from beneficiaries of the Mukhyamantri Majhi Ladki Bahin Yojana DBT scheme.

${customPrompt}

Return your analysis as a structured JSON object with:
{
  "title": "Short title for this analysis",
  "summary": "2-3 sentence executive summary",
  "themes": [
    { "name": "Theme name", "count": <number of stories mentioning it>, "evidence": ["direct quote 1", "direct quote 2"], "policyImplication": "1-sentence implication for policymakers" }
  ],
  "keyInsight": "The single most surprising or important finding in 1-2 sentences",
  "recommendation": "The most actionable policy recommendation based on these stories"
}`;
    } else {
      systemPrompt = `You are a qualitative research analyst specialising in social policy and women's economic empowerment in rural India. Analyse the following first-person narratives from beneficiaries of the Mukhyamantri Majhi Ladki Bahin Yojana DBT scheme.

Identify 4-7 distinct emerging themes — focus on patterns that go BEYOND the standard composites (Household Stability, Debt Relief, Savings, etc.) and surface unexpected, nuanced, or intersectional themes that reveal the human texture of the programme's impact.

Return your analysis as a structured JSON object with:
{
  "title": "Emerging Themes Analysis",
  "summary": "2-3 sentence executive summary of the most striking patterns",
  "themes": [
    { "name": "Theme name", "count": <number of stories mentioning it>, "evidence": ["direct quote 1", "direct quote 2"], "policyImplication": "1-sentence implication for policymakers" }
  ],
  "keyInsight": "The single most surprising or important finding in 1-2 sentences",
  "recommendation": "The most actionable policy recommendation based on these stories"
}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are ${narratives.length} narratives to analyse:\n\n${narrativeBlock}` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Usage credits needed." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!raw) throw new Error("Empty analysis returned");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to extract JSON from markdown code block
      const match = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
      if (match) parsed = JSON.parse(match[1]);
      else throw new Error("Could not parse JSON response");
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-themes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
