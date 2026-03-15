import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── OFFLINE QUEUE ────────────────────────────────────────────────────────────
const QUEUE_KEY = "rootstory_queue";

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); }
  catch { return []; }
}
function saveQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}
function enqueue(record) {
  const q = loadQueue();
  q.push(record);
  saveQueue(q);
}
function dequeue(id) {
  const q = loadQueue().filter(r => r.id !== id);
  saveQueue(q);
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  // Rootstory brand: dark forest green + amber gold + white
  teal:"#0D2818",     // primary brand green (replaces old teal throughout)
  tealDark:"#071A0E", // darker green for gradients/hover
  tealLight:"#E8F5EE",// very light green tint for backgrounds
  tealMid:"#6A9A7A",  // muted green for dividers and subtle accents
  ink:"#0D2818",      // body text — brand green
  inkLight:"#2A4A2A", // secondary text
  paper:"#F9F7F4", paperDark:"#EDE9E3",
  sand:"#C8B89A", sandLight:"#F5F0E8", sandDark:"#8A7060",
  amber:"#E8A020",    // brand amber — "story" gold
  amberLight:"#FEF3DC",
  green:"#0D2818",    // reuse brand green for success states
  greenLight:"#E8F5EE",
  purple:"#5B3A8C", purpleLight:"#F0EBF8",
  white:"#FFFFFF", grey:"#8A8A9A", greyLight:"#F0EEF0",
  red:"#B03020", redLight:"#FDECEA",
  border:"#C8D8C8",   // light green-tinted border
};

// ─── 9 COMPOSITE SCORES ───────────────────────────────────────────────────────
// Each composite is substantively coherent — questions that measure the same
// real-world phenomenon are grouped together.
// Savings ≠ Livelihood. Nutrition ≠ Stabilisation. Banking ≠ Confidence.
const EC = {
  "Household Stability":     {bg:"#E8F5EE", b:"#0D2818", t:"#071A0E"},
  "Debt & Credit Relief":    {bg:"#FEF3DC", b:"#C47A0A", t:"#8A4A00"},
  "Savings & Assets":        {bg:"#E8F5EE", b:"#2E7D52", t:"#1B5E3A"},
  "Nutrition & Health":      {bg:"#FFF0E8", b:"#C85000", t:"#8A2800"},
  "Education":               {bg:"#EEF0FF", b:"#3040C0", t:"#1A2880"},
  "Financial Confidence":    {bg:"#F0EBF8", b:"#5B3A8C", t:"#3A1A6A"},
  "Household Agency":        {bg:"#EBF4FF", b:"#1A5FA8", t:"#0D3D70"},
  "Social Empowerment":      {bg:"#FFF0F8", b:"#A0206A", t:"#700040"},
  "Financial Inclusion":     {bg:"#FFFBE6", b:"#A07800", t:"#705400"},
  "Livelihood & Enterprise": {bg:"#E8F8F0", b:"#107048", t:"#083828"},
  "Community & Social":      {bg:"#FFF3E0", b:"#E65100", t:"#BF360C"},
};

// IIT Madras 4-dimension rollup
const IITM_DIMS = {
  "Household Stability":     "Economic Security",
  "Debt & Credit Relief":    "Economic Security",
  "Savings & Assets":        "Economic Security",
  "Nutrition & Health":      "Consumption Quality & Multiplier",
  "Education":               "Consumption Quality & Multiplier",
  "Financial Confidence":    "Women's Empowerment",
  "Household Agency":        "Women's Empowerment",
  "Social Empowerment":      "Women's Empowerment",
  "Financial Inclusion":     "Women's Empowerment",
  "Livelihood & Enterprise": "Consumption Quality & Multiplier",
  "Community & Social":      "Social Transformation",
};

// ─── MAHARASHTRA DATA ─────────────────────────────────────────────────────────
const MH_DISTRICTS = [
  "Select district…",
  "Ahmednagar","Akola","Amravati","Aurangabad","Beed","Bhandara","Buldhana",
  "Chandrapur","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna",
  "Kolhapur","Latur","Mumbai City","Mumbai Suburban","Nagpur","Nanded",
  "Nandurbar","Nashik","Osmanabad","Palghar","Parbhani","Pune","Raigad",
  "Ratnagiri","Sangli","Satara","Sindhudurg","Solapur","Thane",
  "Wardha","Washim","Yavatmal"
];

const MH_SCHEMES = [
  "Select scheme…",
  "Mukhyamantri Majhi Ladki Bahin Yojana (₹1,500/month)",
  "Ladki Bahin — Enhanced rate",
  "Widow & Destitute Women Pension",
  "Divyang (Disability) Pension — Women",
  "PM Matru Vandana Yojana (PMMVY)",
  "Janani Suraksha Yojana (JSY)",
  "Pradhan Mantri Awas Yojana — Women beneficiary",
  "Namo Shetkari Mahila Scheme",
  "Other Women's DBT Scheme",
];

// ─── SCORE LOGIC ──────────────────────────────────────────────────────────────
// Response value → 0.0–1.0 based on substantive meaning of the answer.
// Weight: 1=supporting, 2=strong signal, 3=primary measure.

const SCORE_MAP = {
  // Scoring convention:
  //   Positive effect  → 0.4–1.0  (proportional to strength)
  //   Weak positive    → 0.3
  //   No effect/neutral → 0.0     (no contribution to score)
  //   Negative effect  → -0.2     (reduces composite score)
  // P3/P4 scale5: UI stores "1"–"5" (position), not label text

  // ── HOUSEHOLD STABILITY ──
  // P3: baseline difficulty — higher = more room for improvement (context weight)
  P3: { "1":1.0, "2":0.75, "3":0.5, "4":0.25, "5":0.0 },
  // P4: relative relief felt — see rephrased question
  P4: { "1":-0.2, "2":0.0, "3":0.4, "4":0.75, "5":1.0 },
  // P5: stability change
  P5: { "Yes, much more stable":1.0, "Yes, somewhat more stable":0.6, "No change":0.0, "No, less stable":-0.2 },
  // P7: shock absorption (only shown if P6=Yes)
  P7: { "Yes, managed without borrowing":1.0, "Yes, but had to borrow":0.4, "No, could not manage it":-0.2, "Not applicable":0.0 },
  // P8: month-end pressure
  P8: { "Yes, significantly":1.0, "Yes, a little":0.6, "No difference":0.0, "Pressure has increased":-0.2 },

  // ── DEBT & CREDIT RELIEF ──
  // P9: baseline borrowing frequency (context — higher baseline = more scope for relief)
  P9:  { "Never":0.0, "Rarely — once or twice a year":0.3, "Sometimes — every few months":0.6, "Often — every month or more":1.0 },
  // P10: borrowing change
  P10: { "Stopped completely":1.0, "Reduced significantly":0.75, "Reduced a little":0.4, "No change":0.0, "Increased":-0.2 },
  // P11: loan avoidance
  P11: { "Yes, avoided at least one loan":1.0, "Possibly":0.5, "No":0.0, "Not applicable":0.0 },
  // A1b: total debt change
  A1b: { "Yes, significantly reduced":1.0, "Yes, somewhat reduced":0.65, "No change":0.0, "Debt has increased":-0.2 },
  // A1c: borrowing dependence
  A1c: { "Yes, much less dependent":1.0, "Yes, a little less":0.6, "About the same":0.0, "More dependent":-0.2 },

  // ── SAVINGS & ASSETS ──
  N1:  { "Yes, saving regularly":1.0, "Yes, saving occasionally":0.65, "Tried but couldn't":0.3, "No":0.0 },
  N2:  { "Yes, multiple assets":1.0, "Yes, one asset":0.7, "No":0.0 },

  // ── NUTRITION & HEALTH ──
  N3:  { "Yes, significantly more":1.0, "Yes, a little more":0.65, "About the same":0.0, "Less":-0.2 },
  N4:  { "Yes, much better":1.0, "Yes, a little better":0.65, "About the same":0.0, "Worse":-0.2 },

  // ── EDUCATION ──
  N5:  { "Yes, significantly more":1.0, "Yes, a little more":0.65, "No change":0.0, "Not applicable — no children in school":0.0 },

  // ── FINANCIAL CONFIDENCE ──
  // P13 scale5: 1=not at all, 5=very confident
  P13: { "1":-0.2, "2":0.0, "3":0.5, "4":0.75, "5":1.0 },
  P14: { "Yes, much more confident":1.0, "Yes, a little more confident":0.65, "No change":0.0, "Less confident":-0.2 },

  // ── HOUSEHOLD AGENCY ──
  // E1: whose account (new always-shown question)
  E1:  { "Directly into my own account":1.0, "Joint account I can access":0.6, "My husband's account":0.0, "Another family member's account":0.0 },
  // E2: who decides spending (new always-shown question)
  E2:  { "I decide":1.0, "Jointly with my husband":0.7, "Mostly my husband":0.0, "My husband or family decides":-0.2 },
  // P15: more say since receiving
  P15: { "Yes, a lot more":1.0, "Yes, a little more":0.6, "No change":0.0, "Less say than before":-0.2 },
  // P16: planning ahead
  P16: { "Yes, regularly":1.0, "Yes, sometimes":0.65, "Not yet but she wants to":0.3, "No":0.0 },
  // A6b: spending decisions (adaptive)
  A6b: { "Yes, I have much more say now":1.0, "Yes, a little more say":0.6, "No change":0.0, "I have even less say now":-0.2 },
  // A6c: decision role change (adaptive, max 1 follow-up after E1/E2)
  A6c: { "Yes, I have much more say":1.0, "Yes, a little more say":0.6, "No change":0.0, "Less say":-0.2 },

  // ── SOCIAL EMPOWERMENT ──
  N7:  { "I feel much more valued":1.0, "I feel somewhat more valued":0.65, "No change":0.0, "I feel less valued":-0.2 },
  N12: { "Yes, much more independent":1.0, "Yes, somewhat more independent":0.65, "No change":0.0, "More dependent than before":-0.2 },

  // ── FINANCIAL INCLUSION ──
  N8:  { "I use it regularly now — didn't before":1.0, "I use it more than before":0.7, "About the same as before":0.0, "I don't have or use a bank account":0.0 },
  N9:  { "Yes, I keep a record or budget":1.0, "Yes, I set aside money for specific purposes":0.8, "Yes, I use an SHG or savings group":0.7, "No specific practice":0.0 },

  // ── LIVELIHOOD & ENTERPRISE ──
  A4b: { "Yes, generating regular income":1.0, "Yes, some additional income":0.65, "Not yet but she expects it to":0.3, "No income generated":0.0 },
  A4c: { "Yes, for household members":0.8, "Yes, for community members":1.0, "No":0.0 },
  A4d: { "Yes, expand":1.0, "Yes, continue at same level":0.65, "Uncertain":0.3, "No":0.0 },

  // ── COMMUNITY & SOCIAL ──
  CS1: { "Yes, spending more":1.0, "About the same":0.0, "Spending less locally":-0.2 },
  CS3: { "Yes, regularly":1.0, "Yes, occasionally":0.6, "No":0.0 },
  CS5: { "Yes, more active":1.0, "About the same":0.0, "Less active":-0.2 },
};

// Which composite(s) each question feeds, and its weight within that composite
const Q_EFFECTS = {
  // ── HOUSEHOLD STABILITY ──
  P3:  [["Household Stability",1]],   // baseline context (higher need = more room)
  P4:  [["Household Stability",3]],   // current difficulty — primary measure
  P5:  [["Household Stability",3]],   // self-reported stability change
  P7:  [["Household Stability",2], ["Debt & Credit Relief",1]], // shock management
  P8:  [["Household Stability",2]],   // month-end pressure reduction

  // ── DEBT & CREDIT RELIEF ──
  P9:  [["Debt & Credit Relief",1]],  // baseline borrowing (context)
  P10: [["Debt & Credit Relief",3]],  // change in borrowing — primary
  P11: [["Debt & Credit Relief",2]],  // concrete loan avoidance
  A1b: [["Debt & Credit Relief",2]],  // adaptive: total debt reduced
  A1c: [["Debt & Credit Relief",2]],  // adaptive: less dependent on borrowing

  // ── SAVINGS & ASSETS ──
  N1:  [["Savings & Assets",3]],      // savings behaviour — primary
  N2:  [["Savings & Assets",2]],      // asset creation

  // ── NUTRITION & HEALTH ──
  N3:  [["Nutrition & Health",3]],    // health expenditure increase — primary
  N4:  [["Nutrition & Health",3]],    // food quality / meal frequency — primary

  // ── EDUCATION ──
  N5:  [["Education",3]],             // education spending — primary (only question)

  // ── FINANCIAL CONFIDENCE ── (subjective sense of capability with money)
  P13: [["Financial Confidence",3]],   // confidence scale today — primary
  P14: [["Financial Confidence",3]],   // confidence change since DBT — primary

  // ── HOUSEHOLD AGENCY ── (decision-making power and control over household money)
  E1:  [["Household Agency",3]],       // whose account DBT lands in — primary structural signal
  E2:  [["Household Agency",3]],       // who decides spending — primary agency signal
  P15: [["Household Agency",2]],       // perceived change in say since receiving
  P16: [["Household Agency",2]],       // forward financial planning behaviour
  A6b: [["Household Agency",2]],       // adaptive: spending decisions confirmed
  A6c: [["Household Agency",2]],       // adaptive: role change confirmed (max 1 follow-up after E1/E2)

  // ── SOCIAL EMPOWERMENT ── (mobility, dignity, family dynamics, independence)
  N7:  [["Social Empowerment",3]],     // self-worth and dignity — primary
  N12: [["Social Empowerment",2]],     // financial independence from family

  // ── FINANCIAL INCLUSION ──
  N8:  [["Financial Inclusion",3]],   // formal banking adoption — primary
  N9:  [["Financial Inclusion",3]],   // financial planning behaviour — primary

  // ── LIVELIHOOD & ENTERPRISE ──
  A4b: [["Livelihood & Enterprise",3]],               // income generated
  A4c: [["Livelihood & Enterprise",2], ["Community & Social",1]], // job creation
  A4d: [["Livelihood & Enterprise",2]],               // sustainability intent

  // ── COMMUNITY & SOCIAL ──
  CS1: [["Community & Social",3]],    // local spending — primary
  CS3: [["Community & Social",2]],    // peer financial support
  CS5: [["Community & Social",2]],    // SHG / community participation
};


// Open text depth questions: flat +5 boost to relevant composites when ≥15 chars answered
// Mapped to the specific composite each depth question is most relevant to
const OPEN_BOOST = {
  P2:  ["Household Stability","Debt & Credit Relief","Savings & Assets","Financial Confidence","Community & Social"],
  D1:  ["Household Stability","Debt & Credit Relief"],   // before moment — hardship before DBT
  D2:  ["Household Stability"],                           // turning point — stability shift
  D4:  ["Financial Confidence","Household Agency","Financial Inclusion"],
  D6:  ["Household Stability","Financial Confidence","Household Agency","Social Empowerment","Community & Social","Savings & Assets"],
  D7:  ["Household Stability","Household Agency","Social Empowerment","Debt & Credit Relief"],
  V4:  ["Household Stability","Financial Confidence","Social Empowerment","Community & Social","Nutrition & Health","Education"],
};

function calcScores(answers) {
  const totals = {}, weights = {};
  Object.keys(EC).forEach(k => { totals[k]=0; weights[k]=0; });

  // Structured question scoring via Q_EFFECTS
  Object.entries(Q_EFFECTS).forEach(([qid, effs]) => {
    const val = (SCORE_MAP as Record<string, Record<string, number>>)[qid]?.[answers[qid] as string];
    if (val === undefined) return;
    effs.forEach(([eff, w]) => { totals[eff] += (val as number)*(w as number); weights[eff] += (w as number); });
  });

  // P1 multi-select: each selection type feeds the correct composite
  // Food/health/clothing → Household Stability (covering basic needs)
  // School fees → Education (developmental spend)
  // Healthcare → Nutrition & Health (health investment)
  // Savings → Savings & Assets (forward-looking behaviour)
  // Business/farm → Livelihood & Enterprise
  // Debt repayment → Debt & Credit Relief
  if (Array.isArray(answers["P1"])) {
    const p1 = answers["P1"];
    const map = [
      { items:["Food & household groceries","Clothing or household items"], eff:"Household Stability", w:1 },
      { items:["Healthcare or medicines"],              eff:"Nutrition & Health",     w:1 },
      { items:["Children's school fees or books"],      eff:"Education",              w:1 },
      { items:["Savings"],                              eff:"Savings & Assets",       w:2 },
      { items:["Starting or running a business or farm activity"], eff:"Livelihood & Enterprise", w:1 },
      { items:["Repaying a loan or debt"],              eff:"Debt & Credit Relief",   w:1 },
    ];
    map.forEach(({ items, eff, w }) => {
      const count = p1.filter(x => items.includes(x)).length;
      if (count > 0) {
        const val = Math.min(count / items.length, 1);
        totals[eff] += val * w;
        weights[eff] += w;
      }
    });
  }

  // Open text depth boost (+5 to each mapped composite when ≥15 chars)
  Object.entries(OPEN_BOOST).forEach(([qid, effs]) => {
    const a = answers[qid];
    if (!a || String(a).trim().length < 15) return;
    effs.forEach(eff => { totals[eff]+=5; weights[eff]+=5; });
  });

  const result = {};
  Object.keys(EC).forEach(k => {
    if (weights[k] === 0) { result[k] = 0; return; }
    const raw = (totals[k] / weights[k]) * 100;
    // Clamp: negative responses can pull below 0, floor at -20
    result[k] = Math.max(-20, Math.min(100, Math.round(raw)));
  });
  return result;
}

// Rollup Rootstory scores → IIT Madras 4-dimension scores
function calcIITMScores(scores) {
  const dims = {};
  const dimWeights = {};
  Object.entries(IITM_DIMS).forEach(([rs, dim]) => {
    if (!dims[dim]) { dims[dim]=0; dimWeights[dim]=0; }
    dims[dim] += scores[rs];
    dimWeights[dim]++;
  });
  const result = {};
  Object.keys(dims).forEach(d => { result[d] = Math.round(dims[d]/dimWeights[d]); });
  return result;
}

// ─── PROMPT BUILDER ───────────────────────────────────────────────────────────
function buildPrompt(answers) {
  const a = answers;
  const scheme    = a["S8"]  || "a women's DBT scheme";
  const district  = a["S2"]  || "Maharashtra";
  const livelihood= a["S10"] || "not specified";
  const hhType    = a["S9"]  || "household";
  const fundUse   = Array.isArray(a["P1"]) ? a["P1"].join(", ") : (a["P1"]||"not recorded");

  const depthMap = {
    D1:"BEFORE THIS MONEY CAME",      D2:"THE MOMENT THINGS CHANGED",
    D4:"HOW IT FEELS TO KNOW IT IS COMING",
    D6:"IN MY OWN WORDS",
    D7:"WHAT I WOULD LOSE IF IT STOPPED", V4:"ANYTHING ELSE I WANT TO SAY"
  };
  const depthLines = Object.entries(depthMap)
    .filter(([id]) => a[id] && String(a[id]).trim().length > 5)
    .map(([id,label]) => `[${label}]: "${a[id]}"`)
    .join("\n");

  // Extra context from new IIT Madras aligned questions
  const extras = [
    a["N1"] && `- Saving behaviour: ${a["N1"]}`,
    a["N2"] && `- Asset purchased since DBT: ${a["N2"]}`,
    a["N3"] && `- Healthcare spending change: ${a["N3"]}`,
    a["N4"] && `- Food quality / nutrition change: ${a["N4"]}`,
    a["N5"] && `- Education spending change: ${a["N5"]}`,
    a["N7"] && `- Sense of self-worth: ${a["N7"]}`,
    a["N8"] && `- Formal banking use: ${a["N8"]}`,
    a["N12"]&& `- Financial independence: ${a["N12"]}`,
  ].filter(Boolean).join("\n");

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
Most important to her: "${a["P2"]||""}"
Expenses before → now: ${a["P3"]||"—"} → ${a["P4"]||"—"} | Stable: ${a["P5"]||"—"}
Pressure reduced: ${a["P8"]||"—"}
Borrowing: ${a["P9"]||"—"} → ${a["P10"]||"—"}
Confidence: ${a["P13"]||"—"}/5 → ${a["P14"]||"—"}
More say at home: ${a["P15"]||"—"} | Planning ahead: ${a["P16"]||"—"}
Saving: ${a["N1"]||"—"} | Asset: ${a["N2"]||"—"}
Food: ${a["N4"]||"—"} | Health spend: ${a["N3"]||"—"} | Education: ${a["N5"]||"—"}
Self-worth: ${a["N7"]||"—"} | Banking: ${a["N8"]||"—"}
Independence: ${a["N12"]||"—"}
Community: ${a["CS1"]||"—"} | Supporting others: ${a["CS3"]||"—"}
${a["A4b"] ? `Livelihood income: ${a["A4b"]}` : ""}
${a["A6b"] ? `Spending decisions: ${a["A6b"]}` : ""}

HER EXACT WORDS (use these, do not paraphrase):
${depthLines || "(none recorded)"}`;
}

// ─── PARTICIPANT ID ───────────────────────────────────────────────────────────
function generateParticipantId(researcherId) {
  const now  = new Date();
  const dd   = String(now.getDate()).padStart(2,"0");
  const mm   = String(now.getMonth()+1).padStart(2,"0");
  const yy   = String(now.getFullYear()).slice(-2);
  const hhmm = String(now.getHours()).padStart(2,"0")+String(now.getMinutes()).padStart(2,"0");
  const seq  = String(Math.floor(Math.random()*900)+100);
  return `${researcherId.toUpperCase()}-${dd}${mm}${yy}-${hhmm}-${seq}`;
}

// ─── ALL QUESTIONS ────────────────────────────────────────────────────────────
const ALL_QUESTIONS = [

  // ── MODULE: SETUP (admin + IIT Madras sampling fields) ───────────────────
  { id:"S2",  module:"setup", label:"District", type:"select", options:MH_DISTRICTS, required:true },
  { id:"S4",  module:"setup", label:"Village / Area", type:"text", placeholder:"Enter village or area name", required:true },
  { id:"S5",  module:"setup", label:"Location", type:"location", required:false },

  // ── MODULE: CONSENT — moved here so researcher gets consent before scheme/sampling details ──
  { id:"C1", module:"consent", label:"Consent confirmed", type:"consent", required:true },

  { id:"S8",  module:"setup", label:"Which DBT scheme is she receiving?", type:"select", options:MH_SCHEMES, required:true },
  { id:"S9",  module:"setup", label:"Household type", type:"single",
    options:["Lives alone","Nuclear family","Joint family","Female-headed household"], required:false },
  { id:"S10", module:"setup", label:"Primary livelihood", type:"single",
    options:["Agriculture (own land)","Agricultural labour","Daily wage labour","Small business / trade","MGNREGS work","No paid work","Other"], required:false },

  // IIT Madras sampling fields — researcher observes and fills, does not ask participant
  { id:"SM1", module:"setup", label:"Settlement type", type:"single", researcherOnly:true,
    options:["Urban","Semi-urban","Rural","Tribal / forest area"],
    hint:"Researcher fills — observe, do not ask participant", required:true },
  { id:"SM2", module:"setup", label:"Approximate monthly household income", type:"single", researcherOnly:true,
    options:["Below ₹5,000","₹5,000–10,000","₹10,000–20,000","Above ₹20,000","Prefer not to say"],
    hint:"Researcher fills — estimate from household observation or records", required:true },
  { id:"SM3", module:"setup", label:"Age group", type:"single", researcherOnly:true,
    options:["18–25","26–35","36–45","46–55","56 and above"],
    hint:"Researcher fills — estimate from observation or records", required:true },
  { id:"SM4", module:"setup", label:"Education level", type:"single", researcherOnly:true,
    options:["No formal education","Primary (up to Class 5)","Secondary (Class 6–10)","Higher Secondary (Class 11–12)","Graduate or above"],
    hint:"Researcher fills — from records or observation", required:true },
  { id:"SM5", module:"setup", label:"Social category", type:"single", researcherOnly:true,
    options:["SC","ST","OBC","General","Prefer not to say"],
    hint:"Researcher fills — from beneficiary records", required:true },
  { id:"SM6", module:"setup", label:"Marital status", type:"single", researcherOnly:true,
    options:["Married","Widowed","Separated / divorced","Single / never married"],
    hint:"Researcher fills — from observation or records", required:true },

  // ── MODULE: CORE — Fund use & importance ─────────────────────────────────
  { id:"P1", module:"core",
    label:"How did she mainly use the DBT money she received?", hint:"Select all that apply",
    type:"multi",
    options:["Food & household groceries","Children's school fees or books","Healthcare or medicines","Repaying a loan or debt","Savings","Starting or running a business or farm activity","Clothing or household items","Other"],
    required:true },
  { id:"P2", module:"core",
    label:"In her own words — what is the single most important thing this money has done for her?",
    hint:"Record exactly what she says", type:"open", required:true },

  // ── CORE — Stabilisation ─────────────────────────────────────────────────
  { id:"P3", module:"core",
    label:"Before receiving this money, how difficult was it to cover essential household expenses each month?",
    type:"scale5", scaleLabels:["Very difficult","Difficult","Neither easy nor hard","Easy","Very easy"], required:true },
  { id:"P4", module:"core",
    label:"Compared to before — has the pressure of covering household expenses felt any different since this money started coming?",
    hint:"₹1,500 may not make expenses easy — we are asking about the feeling of relief relative to before, not whether things are now comfortable.",
    type:"scale5", scaleLabels:["Still just as hard","A little easier","Somewhat easier","Much easier","Completely different — real relief"], required:true },

  // DEPTH — Before Moment (always)
  { id:"D1", module:"depth",
    label:"Tell me about a specific time before this money came when she could not manage an expense. What happened? What did she have to do?",
    hint:"Anchor the story. Get the specific situation — who she went to, what it cost, how it felt.",
    type:"open", trigger:(a)=>["1","2","3"].includes(a["P3"]), depthCategory:"Before Moment", badge:"🕰 Story Depth" },

  { id:"P5", module:"core",
    label:"Since receiving this payment, have her household expenses become more stable month to month?",
    type:"single", options:["Yes, much more stable","Yes, somewhat more stable","No change","No, less stable"], required:true },
  { id:"P6", module:"core",
    label:"In the last 6 months, did she experience an unexpected financial shock?",
    hint:"Medical emergency, crop loss, family bereavement, asset damage",
    type:"single", options:["Yes","No"], required:true },
  { id:"P7", module:"core",
    label:"Was she able to manage it without borrowing at high interest?",
    type:"single", options:["Yes, managed without borrowing","Yes, but had to borrow","No, could not manage it","Not applicable"],
    trigger:(a)=>a["P6"]==="Yes", required:false },
  { id:"P8", module:"core",
    label:"Does she feel the DBT payment has reduced month-end financial pressure?",
    type:"single", options:["Yes, significantly","Yes, a little","No difference","Pressure has increased"], required:true },

  // DEPTH — Turning Point (if stability improved)
  { id:"D2", module:"depth",
    label:"Was there a specific month or moment when she felt things were different because of this payment? What was happening in her life at that time?",
    hint:"Listen for a named event — a school fee paid on time, a medical bill covered, a moneylender visit avoided.",
    type:"open",
    trigger:(a)=>["Yes, much more stable","Yes, somewhat more stable"].includes(a["P5"])||["Yes, significantly","Yes, a little"].includes(a["P8"]),
    depthCategory:"Turning Point", badge:"✦ Story Depth" },

  // ── CORE — Financial Relief ───────────────────────────────────────────────
  { id:"P9", module:"core",
    label:"Before receiving this money, how often did she borrow from a moneylender or informal lender?",
    type:"single", options:["Never","Rarely — once or twice a year","Sometimes — every few months","Often — every month or more"], required:true },
  { id:"P10", module:"core",
    label:"Since receiving this money, how has that borrowing changed?",
    type:"single", options:["Stopped completely","Reduced significantly","Reduced a little","No change","Increased"],
    trigger:(a)=>a["P9"]!=="Never", required:false },

  { id:"P11", module:"core",
    label:"Has this money helped her avoid taking a high-interest loan in the last year?",
    type:"single", options:["Yes, avoided at least one loan","Possibly","No","Not applicable"],
    trigger:(a)=>a["P9"]!=="Never" },
  // N1–N5, N10: IIT Madras consumption quality & economic security gaps
  { id:"N1", module:"core",
    label:"Has she started saving a portion of the DBT money regularly, even a small amount?",
    type:"single", options:["Yes, saving regularly","Yes, saving occasionally","Tried but couldn't","No"],
    required:true },
  { id:"N2", module:"core",
    label:"Has she purchased any asset since receiving this money — livestock, a tool, furniture, or anything of lasting value?",
    type:"single", options:["Yes, multiple assets","Yes, one asset","No"],
    required:true },
  { id:"N3", module:"core",
    label:"In the last 6 months, did her household spend more on healthcare or medicines than before DBT?",
    type:"single", options:["Yes, significantly more","Yes, a little more","About the same","Less"],
    required:true },
  { id:"N4", module:"core",
    label:"Has the quality or quantity of food her household eats improved since she started receiving this money?",
    type:"single", options:["Yes, much better","Yes, a little better","About the same","Worse"],
    required:true },
  { id:"N5", module:"core",
    label:"Has she been able to spend more on her children's education — fees, books, uniforms, or tuition?",
    type:"single", options:["Yes, significantly more","Yes, a little more","No change","Not applicable — no children in school"],
    required:true },
  // ── CORE — Account & Spending Control (always shown — core agency signals) ─
  { id:"E1", module:"core",
    label:"Does the Ladki Bahin payment come directly into her own bank account?",
    hint:"Ask whose account the money goes into — this is the most basic indicator of financial access",
    type:"single",
    options:["Directly into my own account","Joint account I can access","My husband's account","Another family member's account"],
    required:true },
  { id:"E2", module:"core",
    label:"When this money arrives — who decides how it is spent?",
    type:"single",
    options:["I decide","Jointly with my husband","Mostly my husband","My husband or family decides"],
    required:true },

  // ── CORE — Confidence & Agency ────────────────────────────────────────────
  { id:"P13", module:"core",
    label:"On a scale of 1–5, how confident does she feel in managing her household's finances today?",
    hint:"1 = not at all confident, 5 = very confident",
    type:"scale5", scaleLabels:["1 — Not at all","2","3","4","5 — Very confident"], required:true },
  { id:"P14", module:"core",
    label:"Has receiving this money changed how confident she feels about managing money?",
    type:"single", options:["Yes, much more confident","Yes, a little more confident","No change","Less confident"], required:true },
  { id:"P15", module:"core",
    label:"Does she feel she has more say in how the household money is spent since receiving this payment?",
    type:"single", options:["Yes, a lot more","Yes, a little more","No change","Less say than before"], required:true },
  { id:"P16", module:"core",
    label:"Is she now able to plan ahead financially — saving for school fees or a seasonal expense?",
    type:"single", options:["Yes, regularly","Yes, sometimes","Not yet but she wants to","No"], required:true },

  // N6–N9: IIT Madras women's empowerment gaps
  { id:"N7", module:"core",
    label:"How has her sense of her own worth or standing changed since she started receiving this money?",
    type:"single", options:["I feel much more valued","I feel somewhat more valued","No change","I feel less valued"],
    required:true },
  { id:"N8", module:"core",
    label:"How often does she use her bank account now compared to before receiving DBT?",
    type:"single", options:["I use it regularly now — didn't before","I use it more than before","About the same as before","I don't have or use a bank account"],
    required:true },
  { id:"N9", module:"core",
    label:"Has she started doing anything specific to manage her money better — keeping a record, setting aside money, or using a savings group?",
    type:"single", options:["Yes, I keep a record or budget","Yes, I set aside money for specific purposes","Yes, I use an SHG or savings group","No specific practice"],
    required:true },

  // DEPTH — Predictability & Dignity
  { id:"D4", module:"depth",
    label:"How does it feel to know that a payment is coming on a fixed date? Has that changed anything about how she thinks about the future?",
    hint:"Listen for language about dignity, certainty, not having to ask anyone. This is often the most powerful part of the story.",
    type:"open",
    trigger:(a)=>["4","5"].includes(a["P13"])||["Yes, much more confident","Yes, a little more confident"].includes(a["P14"])||["Yes, a lot more","Yes, a little more"].includes(a["P15"]),
    depthCategory:"Predictability & Dignity", badge:"✦ Story Depth" },

  // ── ADAPTIVE — Debt (max 2 follow-ups, triggered after P10 shows change) ────
  // A1b: Has debt reduced? — triggered when P10 shows any reduction AND P1 includes debt
  { id:"A1b", module:"adaptive",
    label:"Has she been able to reduce the total amount of debt her household carries?",
    type:"single", options:["Yes, significantly reduced","Yes, somewhat reduced","No change","Debt has increased"],
    trigger:(a)=>Array.isArray(a["P1"])&&a["P1"].includes("Repaying a loan or debt")&&["Stopped completely","Reduced significantly","Reduced a little"].includes(a["P10"]) },
  // A1c: Less dependent on borrowing? — triggered same context, 2nd and final debt follow-up
  { id:"A1c", module:"adaptive",
    label:"Does she feel less dependent on borrowing to get through the month now?",
    type:"single", options:["Yes, much less dependent","Yes, a little less","About the same","More dependent"],
    trigger:(a)=>Array.isArray(a["P1"])&&a["P1"].includes("Repaying a loan or debt")&&["Stopped completely","Reduced significantly","Reduced a little"].includes(a["P10"]) },

  // ── ADAPTIVE — Livelihood (max 2 follow-ups after P1 livelihood selection) ─
  // A4b: Income generated? — primary livelihood outcome
  { id:"A4b", module:"adaptive",
    label:"Did this activity generate income or improve the household's productive capacity?",
    type:"single", options:["Yes, generating regular income","Yes, some additional income","Not yet but she expects it to","No income generated"],
    trigger:(a)=>Array.isArray(a["P1"])&&a["P1"].includes("Starting or running a business or farm activity") },
  // A4d: Plans to continue? — sustainability signal, 2nd and final livelihood follow-up
  { id:"A4d", module:"adaptive",
    label:"Does she plan to continue or expand this activity in the next 6 months?",
    type:"single", options:["Yes, expand","Yes, continue at same level","Uncertain","No"],
    trigger:(a)=>Array.isArray(a["P1"])&&a["P1"].includes("Starting or running a business or farm activity") },

  // ── ADAPTIVE — Agency (max 2 follow-ups, contextually triggered after E1/E2) ─
  // A6b: Spending decisions detail — triggered when E2 shows limited agency (husband/family decides)
  //      to understand if this is a change from before or a structural constraint
  { id:"A6b", module:"adaptive",
    label:"Has that changed at all since she started receiving this money — does she have more of a say now?",
    type:"single", options:["Yes, I have much more say now","Yes, a little more say","No change","I have even less say now"],
    trigger:(a)=>["My husband or family decides","Mostly my husband"].includes(a["E2"]) },
  // A6c: Role change confirmation — triggered when P15 shows positive change
  //      to get specifics on how the change manifests
  { id:"A6c", module:"adaptive",
    label:"Has her role in household financial decisions changed since receiving this money?",
    type:"single", options:["Yes, I have much more say","Yes, a little more say","No change","Less say"],
    trigger:(a)=>["Yes, a lot more","Yes, a little more"].includes(a["P15"]) },

  // N12: Financial independence — always shown (core social empowerment signal)
  { id:"N12", module:"adaptive",
    label:"Does she feel more financially independent — less dependent on her husband or family — since receiving this payment?",
    type:"single", options:["Yes, much more independent","Yes, somewhat more independent","No change","More dependent than before"],
    trigger:(a)=>true },

  // ── COMMUNITY ─────────────────────────────────────────────────────────────
  { id:"CS1", module:"community",
    label:"Since receiving this payment, has she been spending more at local shops, markets, or with local vendors?",
    type:"single", options:["Yes, spending more","About the same","Spending less locally"], required:true },
  { id:"CS3", module:"community",
    label:"Has she been able to provide financial support to other family members, relatives, or neighbours?",
    type:"single", options:["Yes, regularly","Yes, occasionally","No"], required:true },
  { id:"CS5", module:"community",
    label:"Has she become more active in community activities, SHGs, or local women's groups since receiving this payment?",
    type:"single", options:["Yes, more active","About the same","Less active"], required:true },

  // ── NARRATIVE — Her voice ─────────────────────────────────────────────────
  { id:"D6", module:"narrative",
    label:"If she were to explain to her neighbour what has changed since this money started coming — what would she say? In her own words.",
    hint:"Break from the survey frame. Record her exact language.",
    type:"open", trigger:()=>true, depthCategory:"Own Words", badge:"🎙 Her Voice" },
  { id:"D7", module:"narrative",
    label:"If this payment stopped tomorrow — what is the first thing in her life that would be affected?",
    hint:"This often reveals what matters most. It may be different from what she said earlier.",
    type:"open", trigger:()=>true, depthCategory:"What Would Be Lost", badge:"🎙 Her Voice" },

  // ── VALIDATION ────────────────────────────────────────────────────────────
  { id:"V1", module:"validation", label:"narrative_display", type:"narrative_display", trigger:()=>true, required:false },
  { id:"V2", module:"validation",
    label:"Does this story accurately describe her experience?",
    hint:"Read it aloud to her in her language. Does she recognise herself in it?",
    type:"single", options:["Yes, this is my story","Mostly — small details to adjust","This needs to be rewritten"], required:true },
  { id:"V3", module:"validation",
    label:"What would she like to correct or add?",
    type:"open", trigger:(a)=>["Mostly — small details to adjust","This needs to be rewritten"].includes(a["V2"]),
    hint:"Record her corrections verbatim" },

];

const MODULE_ORDER  = ["setup","consent","core","adaptive","depth","community","narrative","validation"];
const MODULE_LABELS = {
  setup:"Setup", consent:"Consent", core:"Core Questions",
  adaptive:"Follow-Up", depth:"Story Depth", community:"Community",
  narrative:"Her Voice", validation:"Validation"
};
const MODULE_ICONS = {
  setup:"⬡", consent:"✓", core:"◈", adaptive:"◉",
  depth:"✦", community:"◎", narrative:"🎙", validation:"✅"
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ─── APPLY QUESTION EDITOR OVERRIDES ─────────────────────────────────────────
function applyEditorOverrides(questions: typeof ALL_QUESTIONS) {
  try {
    const raw = localStorage.getItem("rootstory_question_overrides");
    if (!raw) return questions;
    const overrides: Record<string, { label?: string; options?: string[] }> = JSON.parse(raw);
    return questions.map(q => {
      const ov = overrides[q.id];
      if (!ov) return q;
      return {
        ...q,
        ...(ov.label    !== undefined ? { label:   ov.label }   : {}),
        ...(ov.options  !== undefined ? { options: ov.options } : {}),
        // keep scaleLabels in sync if options replaced
        ...((ov.options !== undefined && (q as any).scaleLabels) ? { scaleLabels: ov.options } : {}),
      };
    });
  } catch { return questions; }
}

export default function RootstoryInterview() {
  const [phase, setPhase]             = useState("login");
  const [researcher, setResearcher]   = useState(null);
  const [otpSent, setOtpSent]         = useState(false);
  const [phone, setPhone]             = useState("");
  const [otp, setOtp]                 = useState("");
  const [otpError, setOtpError]       = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [answers, setAnswers]         = useState({});
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [narrative, setNarrative]     = useState("");
  const [narLoading, setNarLoading]   = useState(false);
  const [narError, setNarError]       = useState("");
  const [validated, setValidated]     = useState(false);
  const [activeTab, setActiveTab]     = useState("story");
  const [location, setLocation]       = useState(null);
  const [queued, setQueued]           = useState(false);   // narrative queued offline
  const [queue, setQueue]             = useState([]);      // all pending records
  const [syncing, setSyncing]         = useState(false);
  const [syncResult, setSyncResult]   = useState(null);    // {done, failed}
  const online = useOnline();
  const cardRef = useRef(null);

  // Refresh queue display whenever we return to complete screen
  useEffect(() => {
    setQueue(loadQueue());
  }, [phase]);

  // Auto-sync when connection returns
  useEffect(() => {
    if (online && loadQueue().length > 0) syncQueue();
  }, [online]);

  const visibleQuestions = ALL_QUESTIONS.filter(q => {
    if (!q.trigger) return true;
    try { return q.trigger(answers); } catch { return false; }
  });
  const current  = visibleQuestions[currentIdx];
  const progress = visibleQuestions.length > 0 ? (currentIdx / visibleQuestions.length) * 100 : 0;
  const scores   = calcScores(answers);
  const iitmScores = calcIITMScores(scores);

  function answer(val) { setAnswers(p => ({...p, [current.id]: val})); }

  function canAdvance() {
    if (!current) return false;
    if (current.type === "narrative_display") return true;
    if (current.required === false) return true;
    const a = answers[current?.id];
    if (!a) return false;
    if (Array.isArray(a)) return a.length > 0;
    return String(a).trim().length > 0;
  }

  function next() {
    if (currentIdx < visibleQuestions.length - 1) {
      setCurrentIdx(i => i + 1);
      setTimeout(() => cardRef.current?.scrollTo(0,0), 50);
    } else {
      const finalScores = calcScores(answers);
      const finalIitm   = calcIITMScores(answers);
      saveToQueue(answers, finalScores);
      saveToDatabase(answers, finalScores, finalIitm);
      setPhase("complete");
    }
  }
  function prev() { if (currentIdx > 0) setCurrentIdx(i => i - 1); }
  function toggleMulti(opt) {
    const cur = Array.isArray(answers[current.id]) ? answers[current.id] : [];
    answer(cur.includes(opt) ? cur.filter(x=>x!==opt) : [...cur, opt]);
  }

  useEffect(() => {
    if (current?.id === "V1" && !narrative && !narLoading && !queued) {
      if (navigator.onLine) {
        generateNarrative();
      } else {
        // Offline — queue the record, skip live generation
        setQueued(true);
      }
    }
  }, [current?.id]);

  async function generateNarrative() {
    setNarLoading(true); setNarError(""); setNarrative(""); setValidated(false);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-narrative`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ answers }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) { toast.error("Rate limit reached. Please try again shortly."); }
        if (res.status === 402) { toast.error("Usage credits needed. Contact your administrator."); }
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const text = data?.narrative || "";
      if (!text) throw new Error("empty");
      setNarrative(text.trim());
      setQueued(false);
    } catch {
      setNarError("No connection. Story will generate when you sync.");
      setQueued(true);
    } finally { setNarLoading(false); }
  }

  // Save completed interview to offline queue (called when phase becomes "complete")
  function saveToQueue(answersSnap: Record<string, unknown>, scoresSnap: Record<string, number>) {
    const record = {
      id: answersSnap["S1"] || Date.now().toString(),
      timestamp: answersSnap["timestamp"] || new Date().toISOString(),
      answers: answersSnap,
      scores: scoresSnap,
      prompt: buildPrompt(answersSnap),
      narrativeGenerated: false,
      researcherId: researcher?.id,
    };
    enqueue(record);
    setQueue(loadQueue());
  }

  // Persist completed interview to the backend database
  async function saveToDatabase(
    answersSnap: Record<string, unknown>,
    scoresSnap: Record<string, number>,
    impactSnap: Record<string, number>
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("stories").upsert({
        id:               String(answersSnap["S1"] || Date.now()),
        timestamp:        String(answersSnap["timestamp"] || new Date().toISOString()),
        researcher_id:    researcher?.id || null,
        district:         String(answersSnap["S2"] || ""),
        village:          String(answersSnap["S4"] || ""),
        scheme:           String(answersSnap["S8"] || ""),
        narrative:        narrative || null,
        validated:        false,
        answers:          answersSnap,
        scores:           scoresSnap,
        impact_scores:    impactSnap,
        settlement_type:  String(answersSnap["SM1"] || ""),
        income_range:     String(answersSnap["SM2"] || ""),
        age_group:        String(answersSnap["SM3"] || ""),
        education_level:  String(answersSnap["SM4"] || ""),
        social_category:  String(answersSnap["SM5"] || ""),
        marital_status:   String(answersSnap["SM6"] || ""),
        household_type:   String(answersSnap["S9"]  || ""),
        livelihood:       String(answersSnap["S10"] || ""),
        themes:           [],
      });
      if (error) console.error("DB save error:", error);
    } catch (e) {
      console.error("saveToDatabase:", e);
    }
  }

  async function syncQueue() {
    const pending = loadQueue();
    if (pending.length === 0 || !navigator.onLine) return;
    setSyncing(true); setSyncResult(null);
    let done = 0, failed = 0;
    for (const record of pending) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-narrative`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ answers: record.answers }),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const text = data?.narrative || "";
        if (!text) throw new Error("empty");
        const q = loadQueue().map((r: Record<string, unknown>) =>
          r.id === record.id ? {...r, narrative: text.trim(), narrativeGenerated: true} : r
        );
        saveQueue(q);
        if (record.id === answers["S1"]) {
          setNarrative(text.trim());
          setQueued(false);
        }
        done++;
      } catch {
        failed++;
      }
    }
    const q = loadQueue().filter((r: Record<string, unknown>) => !r.narrativeGenerated);
    saveQueue(q);
    setQueue(q);
    setSyncing(false);
    setSyncResult({ done, failed });
  }

  function getLocation() {
    if (!navigator.geolocation) { alert("Geolocation not available."); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat:pos.coords.latitude.toFixed(5), lng:pos.coords.longitude.toFixed(5), accuracy:Math.round(pos.coords.accuracy) };
        setLocation(loc);
        setAnswers(p => ({...p, S5:`${loc.lat}, ${loc.lng} (±${loc.accuracy}m)`}));
      },
      () => alert("Location access denied.")
    );
  }

  function sendOtp() {
    if (phone.replace(/\D/g,"").length < 10) { setOtpError("Enter a valid 10-digit number."); return; }
    setOtpError(""); setLoginLoading(true);
    setTimeout(() => { setOtpSent(true); setLoginLoading(false); }, 900);
  }
  function verifyOtp() {
    setLoginLoading(true);
    setTimeout(() => {
      if (otp.length === 6) {
        const rid = "R" + phone.slice(-4);
        const pid = generateParticipantId(rid);
        setResearcher({ phone, id:rid });
        setAnswers({ S1:pid, timestamp:new Date().toISOString() });
        setPhase("interview");
      } else {
        setOtpError("Incorrect OTP. Please try again.");
      }
      setLoginLoading(false);
    }, 700);
  }

  const moduleBreakpoints: Record<string, number> = {};
  visibleQuestions.forEach((q,i) => { if (!moduleBreakpoints[q.module]) moduleBreakpoints[q.module]=i; });
  const completedModules = Object.entries(moduleBreakpoints).filter(([,i])=>(i as number)<currentIdx).map(([m])=>m);

  function resetAll() {
    setAnswers({}); setCurrentIdx(0); setNarrative(""); setNarLoading(false);
    setNarError(""); setValidated(false); setActiveTab("story"); setLocation(null);
    const pid = generateParticipantId(researcher.id);
    setAnswers({ S1:pid, timestamp:new Date().toISOString() });
    setPhase("interview");
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (phase === "login") return (
    <div style={SS.shell}>
      <div style={SS.loginCard}>
        <div style={{padding:"14px 20px",background:C.teal,borderRadius:8,marginBottom:4}}>
          <span style={{fontSize:28,fontWeight:"bold",color:C.white,fontFamily:"Trebuchet MS,Arial,sans-serif",letterSpacing:0}}>root</span><span style={{fontSize:28,fontWeight:"normal",color:C.amber,fontFamily:"Trebuchet MS,Arial,sans-serif"}}>story</span>
        </div>
        <p style={{fontSize:12,color:C.grey,margin:0,textAlign:"center"}}>Ladki Bahin Yojana · Social Audit · Researcher Login</p>
        <div style={{width:32,height:2,background:C.tealMid,borderRadius:1}} />
        {!otpSent ? (
          <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
            <p style={{fontSize:13,color:C.inkLight,margin:0,textAlign:"center",lineHeight:1.6}}>Enter your registered mobile number.</p>
            <label style={{fontSize:11,color:C.grey,fontWeight:"bold",letterSpacing:0.5}}>MOBILE NUMBER</label>
            <div style={{display:"flex",gap:8}}>
              <span style={{padding:"10px 12px",background:C.greyLight,borderRadius:6,border:`1px solid ${C.border}`,fontSize:14,color:C.inkLight,flexShrink:0}}>+91</span>
              <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                placeholder="98765 43210" maxLength={10}
                style={{flex:1,padding:"10px 14px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:15,color:C.ink,fontFamily:"Georgia,serif",outline:"none",background:C.white}} />
            </div>
            {otpError && <p style={{fontSize:12,color:C.red,margin:0}}>{otpError}</p>}
            <button onClick={sendOtp} disabled={loginLoading} style={{...SS.primaryBtn,opacity:loginLoading?0.6:1}}>
              {loginLoading?"Sending…":"Send OTP →"}
            </button>
          </div>
        ) : (
          <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
            <p style={{fontSize:13,color:C.inkLight,margin:0,textAlign:"center",lineHeight:1.6}}>
              Enter the 6-digit code sent to <strong>+91 {phone}</strong>
              <br/><span style={{fontSize:11,color:C.grey}}>(Demo: any 6 digits)</span>
            </p>
            <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
              placeholder="— — — — — —" maxLength={6} autoFocus
              style={{padding:"14px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:22,color:C.ink,fontFamily:"monospace",outline:"none",textAlign:"center",letterSpacing:8,background:C.white,width:"100%",boxSizing:"border-box"}} />
            {otpError && <p style={{fontSize:12,color:C.red,margin:0}}>{otpError}</p>}
            <button onClick={verifyOtp} disabled={loginLoading||otp.length<6} style={{...SS.primaryBtn,opacity:(loginLoading||otp.length<6)?0.5:1}}>
              {loginLoading?"Verifying…":"Verify & Begin"}
            </button>
            <button onClick={()=>{setOtpSent(false);setOtp("");setOtpError("");}} style={{background:"transparent",border:"none",color:C.grey,fontSize:12,cursor:"pointer",padding:4}}>← Change number</button>
          </div>
        )}
      </div>
    </div>
  );

  // ── COMPLETE ───────────────────────────────────────────────────────────────
  if (phase === "complete") {
    const depthIds = ["D1","D2","D4","D6","D7"];
    const depthLabels = {D1:"Before Moment",D2:"Turning Point",D4:"Predictability & Dignity",D6:"Own Words",D7:"What Would Be Lost"};
    const collected = depthIds.map(id=>({id,label:depthLabels[id],a:answers[id]})).filter(x=>x.a);
    const iitmColors = {
      "Economic Security":              {bg:"#E8F5EE",    b:"#0D2818",t:"#071A0E"},
      "Women's Empowerment":           {bg:"#F0EBF8",    b:"#5B3A8C",t:"#3A1A6A"},
      "Consumption Quality & Multiplier":{bg:C.greenLight,b:C.green,  t:C.green},
      "Social Transformation":          {bg:"#FFF3E0",    b:"#E65100",t:"#BF360C"},
    };

    return (
      <div style={SS.shell}>
        <div style={SS.completeWrap}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",gap:14,padding:"20px 0 16px",borderBottom:`1px solid ${C.border}`,marginBottom:0,flexWrap:"wrap"}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:C.green,color:C.white,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>✓</div>
            <div style={{flex:1}}>
              <h2 style={{fontSize:20,color:C.ink,margin:0,fontFamily:"Georgia,serif"}}>Interview Complete</h2>
              <p style={{fontSize:11,color:C.grey,margin:0}}>
                {[answers["S1"],answers["S2"],answers["S8"]].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button style={{...SS.primaryBtn,fontSize:12,padding:"8px 18px",width:"auto"}} onClick={resetAll}>+ New Interview</button>
          </div>

          {/* SYNC BAR — shows when there are queued records */}
          {queue.length > 0 && (
            <div style={{background: online ? "#FFFBE6" : "#F5F5F5", border:`1px solid ${online?C.amber:C.border}`,borderRadius:8,padding:"12px 16px",margin:"12px 0 0",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <span style={{fontSize:18}}>{online?"📶":"📵"}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:"bold",color:online?C.amber:C.grey}}>
                  {queue.length} interview{queue.length>1?"s":""} waiting for narrative generation
                </div>
                <div style={{fontSize:11,color:C.grey,marginTop:2}}>
                  {online ? "You're online — sync now to generate all pending stories." : "No connection. Stories will sync automatically when you're back online."}
                </div>
              </div>
              {online && (
                <button onClick={syncQueue} disabled={syncing}
                  style={{padding:"8px 16px",borderRadius:6,border:`1.5px solid ${C.teal}`,background:syncing?C.greyLight:C.tealLight,color:C.teal,cursor:syncing?"not-allowed":"pointer",fontSize:12,fontFamily:"Georgia,serif",opacity:syncing?0.6:1}}>
                  {syncing ? "Syncing…" : `Sync ${queue.length} record${queue.length>1?"s":""} →`}
                </button>
              )}
              {syncResult && (
                <span style={{fontSize:11,color:syncResult.failed>0?C.red:C.green,fontWeight:"bold"}}>
                  {syncResult.done > 0 && `✓ ${syncResult.done} done`}
                  {syncResult.failed > 0 && ` · ${syncResult.failed} failed`}
                </span>
              )}
            </div>
          )}

          {/* Tabs */}
          <div style={{display:"flex",borderBottom:`2px solid ${C.paperDark}`}}>
            {[["story","📖 Rootstory"],["scores","◈ Scores"],["impact","◈ Impact Dims"],["data","≡ Data"]].map(([tab,lbl])=>(
              <button key={tab} onClick={()=>setActiveTab(tab)}
                style={{padding:"10px 18px",border:"none",background:"transparent",cursor:"pointer",fontSize:12,
                  color:activeTab===tab?C.teal:C.grey,fontFamily:"Georgia,serif",
                  borderBottom:activeTab===tab?`2px solid ${C.teal}`:"2px solid transparent",
                  marginBottom:"-2px",fontWeight:activeTab===tab?"bold":"normal"}}>{lbl}</button>
            ))}
          </div>

          {/* STORY TAB */}
          {activeTab==="story" && (
            <div style={{background:C.white,border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 12px 12px",padding:"28px 36px",display:"flex",flexDirection:"column",gap:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <span style={{fontSize:11,fontWeight:"bold",padding:"3px 12px",borderRadius:20,border:`1px solid ${validated?C.green:C.amber}`,color:validated?C.green:C.amber,background:validated?C.greenLight:C.amberLight}}>
                  {validated?"✓ Validated Rootstory":"⏳ Pending Validation"}
                </span>
                <span style={{fontSize:11,color:C.grey}}>{new Date(answers["timestamp"]||Date.now()).toLocaleString("en-IN",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
              </div>
              {narrative && (
                <>
                  <div>
                    <div style={{fontSize:60,color:C.tealMid,lineHeight:0.5,fontFamily:"Georgia,serif",marginBottom:8,userSelect:"none"}}>"</div>
                    <div style={{fontSize:16,color:C.ink,lineHeight:1.9,borderLeft:`3px solid ${C.tealMid}`,paddingLeft:20}}>
                      {narrative.split("\n\n").map((p,i)=><p key={i} style={{margin:i===0?"0 0 14px":"14px 0 0"}}>{p}</p>)}
                    </div>
                    <div style={{fontSize:60,color:C.tealMid,lineHeight:0.3,fontFamily:"Georgia,serif",textAlign:"right",userSelect:"none"}}>"</div>
                  </div>
                  {collected.length>0&&(
                    <div style={{background:C.sandLight,border:`1px solid ${C.sand}`,borderRadius:8,padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{fontSize:9,fontWeight:"bold",color:C.sandDark,textTransform:"uppercase",letterSpacing:1}}>Source Anchors</div>
                      {collected.map(({id,label,a})=>(
                        <div key={id} style={{display:"flex",flexDirection:"column",gap:4}}>
                          <span style={{fontSize:9,fontWeight:"bold",color:C.amber,background:C.amberLight,padding:"1px 8px",borderRadius:3,alignSelf:"flex-start",letterSpacing:0.5}}>{label}</span>
                          <span style={{fontSize:12,color:C.inkLight,fontStyle:"italic",lineHeight:1.6,borderLeft:`2px solid ${C.sand}`,paddingLeft:10}}>"{a}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{background:C.greyLight,border:`1px solid ${C.border}`,borderRadius:8,padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
                    <p style={{margin:0,fontSize:13,color:C.inkLight,fontWeight:"bold"}}>Read this aloud to her in her language. Does she recognise herself in it?</p>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <button onClick={()=>setValidated(true)} style={{padding:"8px 16px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif",border:`1.5px solid ${C.green}`,background:validated?C.green:C.greenLight,color:validated?C.white:C.green}}>✓ Yes, she confirmed</button>
                      <button onClick={generateNarrative} style={{padding:"8px 16px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif",border:`1.5px solid ${C.grey}`,background:C.white,color:C.grey}}>↺ Regenerate</button>
                    </div>
                    {validated&&<div style={{fontSize:12,fontWeight:"bold",color:C.green,background:C.greenLight,padding:"8px 12px",borderRadius:5}}>✓ Record ready for submission.</div>}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ROOTSTORY SCORES TAB */}
          {activeTab==="scores" && (
            <div style={{background:C.white,border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 12px 12px",padding:"24px 28px",display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                {Object.entries(scores).map(([eff,sc])=>{
                  const scNum = sc as number;
                  const col=EC[eff];
                  return (
                    <div key={eff} style={{flex:"1 1 140px",borderRadius:10,padding:"16px",border:`1.5px solid ${col.b}`,background:col.bg,display:"flex",flexDirection:"column",gap:5,alignItems:"center"}}>
                      <div style={{fontSize:34,fontWeight:"bold",color:col.t,fontFamily:"Georgia,serif"}}>{scNum}</div>
                      <div style={{fontSize:10,fontWeight:"bold",textAlign:"center",color:col.t}}>{eff}</div>
                      <div style={{width:"100%",height:4,background:"rgba(0,0,0,0.08)",borderRadius:2}}>
                        <div style={{height:"100%",borderRadius:2,background:col.b,width:`${scNum}%`,transition:"width 0.5s"}} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p style={{fontSize:11,color:C.grey,fontStyle:"italic",margin:0}}>Weighted composite scores (0–100) based on logically coded responses across all answered questions.</p>
            </div>
          )}

          {/* IMPACT DIMENSIONS TAB */}
          {activeTab==="impact" && (
            <div style={{background:C.white,border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 12px 12px",padding:"24px 28px",display:"flex",flexDirection:"column",gap:16}}>
              <p style={{fontSize:13,color:C.inkLight,margin:0,lineHeight:1.6}}>Impact reporting dimensions — rolled up from Rootstory effect scores for the Social Impact Audit of Mukhyamantri Majhi Ladki Bahin Yojana.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                {Object.entries(iitmScores).map(([dim,sc])=>{
                  const scNum = sc as number;
                  const col=iitmColors[dim]||{bg:C.greyLight,b:C.grey,t:C.grey};
                  return (
                    <div key={dim} style={{flex:"1 1 180px",borderRadius:10,padding:"18px",border:`1.5px solid ${col.b}`,background:col.bg,display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                      <div style={{fontSize:36,fontWeight:"bold",color:col.t,fontFamily:"Georgia,serif"}}>{scNum}</div>
                      <div style={{fontSize:11,fontWeight:"bold",textAlign:"center",color:col.t}}>{dim}</div>
                      <div style={{width:"100%",height:4,background:"rgba(0,0,0,0.08)",borderRadius:2}}>
                        <div style={{height:"100%",borderRadius:2,background:col.b,width:`${scNum}%`,transition:"width 0.5s"}} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{background:C.greyLight,borderRadius:8,padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
                <div style={{fontSize:10,fontWeight:"bold",color:C.grey,textTransform:"uppercase",letterSpacing:1}}>Dimension Mapping</div>
                {Object.entries(IITM_DIMS).map(([rs,dim])=>(
                  <div key={rs} style={{display:"flex",gap:8,fontSize:12,alignItems:"center"}}>
                    <span style={{color:C.teal,fontWeight:"bold",width:180,flexShrink:0}}>{rs}</span>
                    <span style={{color:C.grey,fontSize:10}}>→</span>
                    <span style={{color:C.inkLight}}>{dim}</span>
                    <span style={{marginLeft:"auto",fontFamily:"monospace",fontSize:11,color:EC[rs]?.t||C.grey}}>{scores[rs]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATA TAB */}
          {activeTab==="data" && (
            <div style={{background:C.white,border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 12px 12px",display:"flex",flexDirection:"column"}}>
              {[{id:"S1",label:"Participant ID"},{id:"timestamp",label:"Timestamp"},...ALL_QUESTIONS].filter(q=>answers[q.id]).map((q,i)=>(
                <div key={q.id} style={{display:"flex",gap:10,padding:"9px 20px",background:i%2===0?C.greyLight:C.white,alignItems:"flex-start",borderBottom:`1px solid ${C.paperDark}`}}>
                  <span style={{fontFamily:"monospace",fontSize:10,color:C.teal,width:40,flexShrink:0,marginTop:1}}>{q.id}</span>
                  <span style={{fontSize:11,color:C.grey,flex:"0 0 220px",lineHeight:1.4}}>{(q.label||"").slice(0,55)}{(q.label||"").length>55?"…":""}</span>
                  <span style={{fontSize:11,color:C.ink,flex:1,fontStyle:"italic",lineHeight:1.5}}>{Array.isArray(answers[q.id])?answers[q.id].join(", "):String(answers[q.id]).slice(0,200)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── INTERVIEW ──────────────────────────────────────────────────────────────
  if (!current) return null;
  const isDepth = current.module==="depth"||current.module==="narrative";
  const isNarrativeDisplay = current.type==="narrative_display";
  const isSetupMeta = current.researcherOnly === true;
  const effArr = (current as Record<string, unknown>).effect ? (Array.isArray((current as Record<string, unknown>).effect)?(current as Record<string, unknown>).effect as string[]:[(current as Record<string, unknown>).effect as string]) : [];

  return (
    <div style={SS.shell}>
      {/* Progress bar */}
      <div style={{height:3,background:C.paperDark,position:"sticky",top:0,zIndex:100}}>
        <div style={{height:"100%",background:`linear-gradient(90deg,${C.teal},${C.tealDark})`,width:`${progress}%`,transition:"width 0.4s"}} />
      </div>

      <div style={{display:"flex",flex:1,maxWidth:1100,margin:"0 auto",width:"100%",padding:"20px 16px",gap:20}}>

        {/* SIDEBAR */}
        <div style={{width:200,flexShrink:0,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:8,borderBottom:`2px solid ${C.tealMid}`}}>
            <span style={{fontFamily:"Trebuchet MS,Arial,sans-serif",fontSize:16,letterSpacing:0}}>
              <span style={{fontWeight:"bold",color:C.teal}}>root</span><span style={{fontWeight:"normal",color:C.amber}}>story</span>
            </span>
            <span title={online?"Online":"Offline"} style={{width:8,height:8,borderRadius:"50%",background:online?C.green:C.red,flexShrink:0}} />
          </div>
          <div style={{fontSize:9,color:C.grey,lineHeight:1.6}}>
            {researcher&&<div>Researcher: {researcher.id}</div>}
            <div>PID: {answers["S1"]?.slice(0,18)||"—"}</div>
            {answers["S2"]&&<div>{answers["S2"]}</div>}
            {answers["S5"]&&<div>📍 GPS captured</div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {MODULE_ORDER.map(mod => {
              if (moduleBreakpoints[mod]===undefined) return null;
              const done=completedModules.includes(mod), active=current.module===mod;
              return (
                <div key={mod} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 7px",borderRadius:5,fontSize:11,
                  color:active?C.teal:done?C.teal:C.grey,opacity:done&&!active?0.6:1,
                  background:active?C.tealLight:"transparent",border:active?`1px solid ${C.tealMid}`:"1px solid transparent",
                  fontWeight:active?"bold":"normal"}}>
                  <span style={{fontSize:11,width:14,textAlign:"center"}}>{done?"✓":MODULE_ICONS[mod]}</span>
                  <span>{MODULE_LABELS[mod]}</span>
                </div>
              );
            })}
          </div>
          {/* Live scores */}
          <div style={{background:C.white,borderRadius:8,padding:10,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:9,fontWeight:"bold",color:C.grey,textTransform:"uppercase",letterSpacing:1}}>Live Scores</div>
            {Object.entries(scores).map(([eff,sc])=>{
              const scNum = sc as number;
              const col=EC[eff];
              return (
                <div key={eff} style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:8,color:C.inkLight,width:68,flexShrink:0,lineHeight:1.1}}>{eff.length>12?eff.slice(0,11)+"…":eff}</span>
                  <div style={{flex:1,height:3,background:C.paperDark,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:col.b,width:`${scNum}%`,transition:"width 0.5s"}} /></div>
                  <span style={{fontSize:9,fontWeight:"bold",color:col.t,width:20,textAlign:"right"}}>{scNum}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN CARD */}
        <div style={{flex:1}}>
          <div ref={cardRef} style={{
            background:isDepth||isNarrativeDisplay?`linear-gradient(135deg,${C.white},${C.sandLight})`:isSetupMeta?`linear-gradient(135deg,${C.white},#F8F0FF)`:C.white,
            borderRadius:12, padding:"26px 30px",
            boxShadow:"0 2px 18px rgba(26,26,46,0.07)",
            border:`1px solid ${isDepth||isNarrativeDisplay?C.sand:isSetupMeta?"#D4C4E8":C.border}`,
            display:"flex", flexDirection:"column", gap:16}}>

            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontFamily:"monospace",fontSize:10,color:isSetupMeta?C.purple:C.teal,fontWeight:"bold",background:isSetupMeta?C.purpleLight:C.tealLight,padding:"2px 6px",borderRadius:3}}>{current.id}</span>
                <span style={{fontSize:10,color:C.grey}}>{MODULE_LABELS[current.module]}</span>
                {current.badge&&<span style={{fontSize:10,fontWeight:"bold",color:C.amber,background:C.amberLight,padding:"2px 7px",borderRadius:3}}>{current.badge}</span>}
                {isSetupMeta&&<span style={{fontSize:9,fontWeight:"bold",color:C.purple,background:C.purpleLight,padding:"2px 7px",borderRadius:3}}>Sampling Data</span>}
              </div>
              {effArr.length>0&&!effArr.includes("All")&&(
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {effArr.map(eff=>{const col=EC[eff]; return col?<span key={eff} style={{fontSize:9,fontWeight:"bold",padding:"2px 7px",borderRadius:20,border:`1px solid ${col.b}`,background:col.bg,color:col.t}}>{eff}</span>:null;})}
                </div>
              )}
            </div>

            {/* Depth stripe */}
            {isDepth&&(
              <div style={{background:`linear-gradient(90deg,${C.amberLight},transparent)`,borderLeft:`3px solid ${C.amber}`,padding:"6px 12px",borderRadius:"0 5px 5px 0",display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:C.amber}}>✦</span>
                <span style={{fontSize:12,color:C.amber,fontStyle:"italic"}}>{current.depthCategory} — enriches the story</span>
              </div>
            )}

            {/* Sampling metadata stripe */}
            {isSetupMeta&&(
              <div style={{background:`linear-gradient(90deg,${C.purpleLight},transparent)`,borderLeft:`3px solid ${C.purple}`,padding:"6px 12px",borderRadius:"0 5px 5px 0",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,color:C.purple,fontStyle:"italic"}}>Researcher fills — do not read this question to the participant</span>
              </div>
            )}

            {/* Narrative display (V1) */}
            {isNarrativeDisplay && (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div style={{fontSize:16,color:C.teal,fontWeight:"bold",fontFamily:"Georgia,serif"}}>📖 Her Rootstory</div>
                <p style={{fontSize:13,color:C.inkLight,margin:0,lineHeight:1.6}}>Based on this interview, here is the story generated from her answers. Read it aloud to her in her language, then confirm accuracy on the next question.</p>
                {narLoading&&(
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"24px",background:C.tealLight,borderRadius:8}}>
                    <div style={{width:28,height:28,border:`2px solid ${C.tealMid}`,borderTop:`2px solid ${C.teal}`,borderRadius:"50%",animation:"spin 0.9s linear infinite",flexShrink:0}} />
                    <span style={{fontSize:13,color:C.teal,fontStyle:"italic"}}>Writing her story from the interview…</span>
                  </div>
                )}
                {queued&&!narLoading&&!narrative&&(
                  <div style={{background:"#FFF8E6",border:`1px solid ${C.amber}`,borderRadius:8,padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:18}}>📵</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:"bold",color:C.amber}}>No connection — story queued</div>
                        <div style={{fontSize:12,color:C.inkLight,marginTop:2}}>The interview is saved. The narrative will generate automatically when you have signal.</div>
                      </div>
                    </div>
                    {online&&<button onClick={generateNarrative} style={{padding:"8px 14px",borderRadius:6,border:`1.5px solid ${C.teal}`,background:C.tealLight,color:C.teal,cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif",alignSelf:"flex-start"}}>🔄 Connection restored — generate now</button>}
                  </div>
                )}
                {narError&&!queued&&(
                  <div style={{background:C.redLight,border:`1px solid ${C.red}`,borderRadius:8,padding:"12px 16px",display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:13,color:C.red,flex:1}}>{narError}</span>
                    <button onClick={generateNarrative} style={{padding:"5px 12px",borderRadius:5,border:`1.5px solid ${C.red}`,background:"transparent",color:C.red,cursor:"pointer",fontSize:12}}>Retry</button>
                  </div>
                )}
                {narrative&&!narLoading&&(
                  <div>
                    <div style={{fontSize:50,color:C.tealMid,lineHeight:0.5,fontFamily:"Georgia,serif",marginBottom:6,userSelect:"none"}}>"</div>
                    <div style={{fontSize:16,color:C.ink,lineHeight:1.9,borderLeft:`3px solid ${C.tealMid}`,paddingLeft:18}}>
                      {narrative.split("\n\n").map((p,i)=><p key={i} style={{margin:i===0?"0 0 12px":"12px 0 0"}}>{p}</p>)}
                    </div>
                    <div style={{fontSize:50,color:C.tealMid,lineHeight:0.3,fontFamily:"Georgia,serif",textAlign:"right",userSelect:"none"}}>"</div>
                    <div style={{marginTop:12,padding:"10px 14px",background:C.amberLight,border:`1px solid ${C.amber}`,borderRadius:6,fontSize:12,color:C.amber}}>
                      📢 Read this aloud to her now, then continue to confirm accuracy.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Location */}
            {current.type==="location" && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{fontSize:18,color:C.ink,lineHeight:1.5,fontFamily:"Georgia,serif"}}>{current.label}</div>
                {!location ? (
                  <button onClick={getLocation} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",background:C.tealLight,border:`1.5px dashed ${C.teal}`,borderRadius:8,cursor:"pointer",fontSize:14,color:C.teal,fontFamily:"Georgia,serif"}}>
                    📍 Capture Current Location
                  </button>
                ) : (
                  <div style={{padding:"12px 16px",background:C.greenLight,border:`1px solid ${C.green}`,borderRadius:8,fontSize:13,color:C.green}}>
                    ✓ {location.lat}, {location.lng} (±{location.accuracy}m)
                  </div>
                )}
                <p style={{fontSize:11,color:C.grey,fontStyle:"italic",margin:0}}>Optional — uses device GPS. Stored with the interview record.</p>
              </div>
            )}

            {/* Standard label */}
            {!isNarrativeDisplay && current.type!=="location" && (
              <>
                <div style={{fontSize:18,color:C.ink,lineHeight:1.55,letterSpacing:"-0.1px",fontFamily:"Georgia,serif"}}>{current.label}</div>
                {current.hint&&<div style={{fontSize:12,color:C.grey,fontStyle:"italic",lineHeight:1.5,background:C.greyLight,padding:"6px 10px",borderRadius:5,borderLeft:`2px solid ${C.sand}`}}>{current.hint}</div>}
              </>
            )}

            {/* Consent */}
            {current.type==="consent" && (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {["Explained the purpose of the interview to her","Confirmed her participation is voluntary and will not affect her payments","Explained her responses will be used only for programme evaluation","Received her verbal consent to proceed"].map(item=>(
                  <label key={item} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"8px 10px",background:Array.isArray(answers["C1"])&&answers["C1"].includes(item)?C.greenLight:C.greyLight,borderRadius:6,border:`1px solid ${Array.isArray(answers["C1"])&&answers["C1"].includes(item)?C.green:C.border}`}}>
                    <input type="checkbox" style={{marginTop:2,accentColor:C.teal}}
                      checked={Array.isArray(answers["C1"])&&answers["C1"].includes(item)}
                      onChange={()=>{const c=Array.isArray(answers["C1"])?answers["C1"]:[];answer(c.includes(item)?c.filter(x=>x!==item):[...c,item]);}} />
                    <span style={{fontSize:13,color:C.inkLight,lineHeight:1.5}}>{item}</span>
                  </label>
                ))}
                {Array.isArray(answers["C1"])&&answers["C1"].length===4&&<div style={{color:C.green,fontWeight:"bold",fontSize:12,background:C.greenLight,padding:"8px 12px",borderRadius:5}}>✓ All consent steps confirmed</div>}
              </div>
            )}

            {/* Single select */}
            {current.type==="single" && (
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {current.options?.map(opt=>(
                  <button key={opt} onClick={()=>answer(opt)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",
                      background:answers[current.id]===opt?C.tealLight:C.greyLight,
                      border:`1px solid ${answers[current.id]===opt?C.teal:C.border}`,
                      borderRadius:7,cursor:"pointer",textAlign:"left",fontSize:13,
                      color:answers[current.id]===opt?C.tealDark:C.inkLight,fontFamily:"Georgia,serif",
                      fontWeight:answers[current.id]===opt?"bold":"normal",transition:"all 0.1s"}}>
                    <span style={{color:C.teal,width:18,flexShrink:0,fontSize:15}}>{answers[current.id]===opt?"●":"○"}</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Multi select */}
            {current.type==="multi" && (
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {current.options?.map(opt=>{
                  const sel=Array.isArray(answers[current.id])&&answers[current.id].includes(opt);
                  return (
                    <button key={opt} onClick={()=>toggleMulti(opt)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",
                        background:sel?C.tealLight:C.greyLight,border:`1px solid ${sel?C.teal:C.border}`,
                        borderRadius:7,cursor:"pointer",textAlign:"left",fontSize:13,
                        color:sel?C.tealDark:C.inkLight,fontFamily:"Georgia,serif",fontWeight:sel?"bold":"normal"}}>
                      <span style={{color:C.teal,width:18,flexShrink:0,fontSize:15}}>{sel?"■":"□"}</span>{opt}
                    </button>
                  );
                })}
                <p style={{fontSize:11,color:C.grey,fontStyle:"italic",margin:"2px 0 0"}}>Select all that apply</p>
              </div>
            )}

            {/* Scale 5 */}
            {current.type==="scale5" && (
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(current.scaleLabels||["1","2","3","4","5"]).map((lbl,i)=>{
                  const v=String(i+1),sel=answers[current.id]===v;
                  return (
                    <button key={i} onClick={()=>answer(v)}
                      style={{flex:1,minWidth:70,padding:"10px 5px",border:`1px solid ${sel?C.teal:C.border}`,
                        borderRadius:7,background:sel?C.tealLight:C.greyLight,cursor:"pointer",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <span style={{fontSize:20,fontWeight:"bold",color:C.teal}}>{i+1}</span>
                      <span style={{fontSize:9,color:C.grey,textAlign:"center",lineHeight:1.2}}>{lbl}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Select */}
            {current.type==="select" && (
              <select value={answers[current.id]||""} onChange={e=>answer(e.target.value)}
                style={{width:"100%",padding:"11px 14px",borderRadius:7,border:`1px solid ${C.border}`,background:C.white,fontSize:14,color:C.ink,fontFamily:"Georgia,serif",outline:"none"}}>
                {current.options?.map(o=><option key={o} value={o.includes("…")?"":o}>{o}</option>)}
              </select>
            )}

            {/* Text */}
            {current.type==="text" && (
              <input value={answers[current.id]||""} onChange={e=>answer(e.target.value)}
                placeholder={current.placeholder||"Enter value…"}
                style={{width:"100%",padding:"11px 14px",borderRadius:7,border:`1px solid ${C.border}`,background:C.white,fontSize:14,color:C.ink,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box"}} />
            )}

            {/* Open text */}
            {current.type==="open" && (
              <textarea value={answers[current.id]||""} onChange={e=>answer(e.target.value)}
                placeholder={isDepth?"Record her exact words as closely as possible…":"Record response…"}
                rows={isDepth?6:4}
                style={{width:"100%",padding:"12px 14px",borderRadius:7,
                  border:`1px solid ${isDepth?C.sand:C.border}`,
                  background:isDepth?C.sandLight:C.white,
                  fontSize:isDepth?15:14,color:C.ink,fontFamily:"Georgia,serif",
                  outline:"none",resize:"vertical",lineHeight:1.65,boxSizing:"border-box",minHeight:isDepth?110:80}} />
            )}

            {/* Nav */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:16,borderTop:`1px solid ${C.paperDark}`,marginTop:4}}>
              <button onClick={prev} disabled={currentIdx===0}
                style={{padding:"8px 16px",borderRadius:5,border:`1px solid ${C.border}`,background:C.white,cursor:currentIdx===0?"not-allowed":"pointer",fontSize:13,color:C.inkLight,fontFamily:"Georgia,serif",opacity:currentIdx===0?0.35:1}}>← Back</button>
              <span style={{fontSize:11,color:C.grey}}>{currentIdx+1} / {visibleQuestions.length}</span>
              <button onClick={next} disabled={!canAdvance()}
                style={{padding:"8px 20px",borderRadius:5,border:"none",background:!canAdvance()?C.grey:C.teal,color:C.white,cursor:!canAdvance()?"not-allowed":"pointer",fontSize:13,fontWeight:"bold",fontFamily:"Georgia,serif",opacity:!canAdvance()?0.45:1,transition:"all 0.15s"}}>
                {currentIdx===visibleQuestions.length-1?"Complete ✓":"Next →"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const SS: Record<string, CSSProperties> = {
  shell:{ minHeight:"100vh", background:C.paper, fontFamily:"Georgia,serif", display:"flex", flexDirection:"column" },
  loginCard:{ maxWidth:420, margin:"80px auto", background:C.white, borderRadius:14, padding:"40px 44px", boxShadow:"0 8px 40px rgba(26,26,46,0.1)", display:"flex", flexDirection:"column", alignItems:"center", gap:14, border:`1px solid ${C.border}` },
  logoRing:{ width:48, height:48, borderRadius:"50%", background:C.teal, display:"flex", alignItems:"center", justifyContent:"center" },
  primaryBtn:{ width:"100%", padding:"12px", borderRadius:7, border:"none", background:C.teal, color:C.white, fontSize:14, fontFamily:"Trebuchet MS,Arial,sans-serif", cursor:"pointer", letterSpacing:0.3, transition:"opacity 0.15s" },
  completeWrap:{ maxWidth:880, margin:"0 auto", width:"100%", padding:"20px 20px 40px", display:"flex", flexDirection:"column", gap:0 },
};
