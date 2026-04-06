import { useState, useRef, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { evaluateCondition } from "@/lib/conditionEvaluator";

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

// ─── 8 COMPOSITE SCORES ───────────────────────────────────────────────────────
const EC = {
  "Consumption Quality":     {bg:"#E8F5EE", b:"#0D2818", t:"#071A0E"},
  "Nutrition & Health":      {bg:"#FFF0E8", b:"#C85000", t:"#8A2800"},
  "Education":               {bg:"#EEF0FF", b:"#3040C0", t:"#1A2880"},
  "Savings & Resilience":    {bg:"#FEF3DC", b:"#C47A0A", t:"#8A4A00"},
  "Livelihood & Enterprise": {bg:"#E8F8F0", b:"#107048", t:"#083828"},
  "Financial Inclusion":     {bg:"#FFFBE6", b:"#A07800", t:"#705400"},
  "Financial Confidence":    {bg:"#F0EBF8", b:"#5B3A8C", t:"#3A1A6A"},
  "Household Agency":        {bg:"#EBF4FF", b:"#1A5FA8", t:"#0D3D70"},
  "Social Empowerment":      {bg:"#FFF0F8", b:"#A0206A", t:"#700040"},
  "Overall Perception":      {bg:"#FFF3E0", b:"#E65100", t:"#BF360C"},
};

// 4-dimension rollup
const DOMAIN_COMPOSITES: Record<string, string[]> = {
  "Consumption Quality & Multiplier": ["Consumption Quality", "Nutrition & Health", "Education"],
  "Economic Security":                ["Savings & Resilience", "Livelihood & Enterprise", "Financial Inclusion"],
  "Women's Empowerment":              ["Financial Confidence", "Household Agency", "Social Empowerment"],
  "Social Transformation":            ["Social Empowerment", "Overall Perception"],
};

const COMPOSITE_DIMS: Record<string, string[]> = {
  "Consumption Quality":     ["Consumption Quality & Multiplier"],
  "Nutrition & Health":      ["Consumption Quality & Multiplier"],
  "Education":               ["Consumption Quality & Multiplier"],
  "Savings & Resilience":    ["Economic Security"],
  "Livelihood & Enterprise": ["Economic Security"],
  "Financial Inclusion":     ["Economic Security"],
  "Financial Confidence":    ["Women's Empowerment"],
  "Household Agency":        ["Women's Empowerment"],
  "Social Empowerment":      ["Women's Empowerment", "Social Transformation"],
  "Overall Perception":      ["Social Transformation"],
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
  // ── CONSUMPTION QUALITY ──
  "CQ-3": { "Yes, much better":1.0, "Yes, a little better":0.65, "About the same":0.2, "Worse":0.0 },
  "CQ-7": { "Yes, significantly":1.0, "Yes, a little":0.65, "About the same":0.2, "No, worse":0.0, "Not applicable — no children in school":0.4 },

  // ── SAVINGS & RESILIENCE ──
  "ES-1": { "Yes":1.0, "No":0.0 },
  "ES-2": { "Yes":1.0, "No":0.0 },
  "ES-3": { "None":0.0, "Less than ₹500":0.3, "₹500–₹1,000":0.65, "More than ₹1,000":1.0 },
  "ES-4": { "Yes, easily":1.0, "With difficulty":0.4, "No":0.0 },
  "ES-5": { "Yes":1.0, "Same as before":0.3, "No, borrowing increased":0.0 },

  // ── LIVELIHOOD & ENTERPRISE ──
  "ES-7": { "Yes":1.0, "No":0.0 },
  "ES-8": { "Started working for the first time":1.0, "Started a small business":1.0, "No change in her work or activity":0.0 },
  "ES-9": { "Yes, it helped start a new activity":1.0, "Yes, it is supporting existing work":0.7, "No":0.0 },

  // ── FINANCIAL INCLUSION ──
  "ES-10": { "Yes":1.0, "No":0.0 },
  "ES-11": { "Yes":1.0, "No":0.0 },

  // ── FINANCIAL CONFIDENCE ──
  "WE-1": { "Yes, much more independent":1.0, "Yes, somewhat more independent":0.65, "No change":0.2, "Less independent than before":0.0 },
  "WE-2": { "Yes, much more confident":1.0, "Yes, a little more confident":0.65, "No change":0.2, "Less confident":0.0 },

  // ── HOUSEHOLD AGENCY ──
  "WE-3": { "Yes, I decide alone":1.0, "Yes, jointly with my husband / partner":0.8, "My husband / partner decides":0.0, "Another family member decides":0.0 },
  "WE-4": { "Yes, I have much more say":1.0, "Yes, a little more say":0.6, "No change":0.2, "Less say than before":0.0 },
  "WE-6": { "Yes, much more":1.0, "Yes, a little":0.6, "No change":0.2, "Less respected than before":0.0 },

  // ── SOCIAL EMPOWERMENT ──
  "WE-9":  { "Yes, regularly":1.0, "Yes, sometimes":0.65, "Not yet but she wants to":0.3, "No":0.0 },
  "WE-11": { "Yes":1.0, "No":0.0 },

  // ── OVERALL PERCEPTION ──
  "ST-1": { "Very important":1.0, "Somewhat important":0.5, "Not important":0.0 },
  "ST-2": { "Yes, significantly":1.0, "Yes, slightly":0.5, "No":0.0 },
};

const Q_EFFECTS = {
  // ── CONSUMPTION QUALITY & MULTIPLIER ──
  "CQ-3":  [["Consumption Quality",3], ["Nutrition & Health",2]],   // food quality → both
  "CQ-7":  [["Education",3], ["Consumption Quality",1]],           // children's edu improvement

  // ── ECONOMIC SECURITY ──
  "ES-1":  [["Financial Inclusion",2]],                             // has bank account
  "ES-2":  [["Savings & Resilience",3]],                            // saves regularly
  "ES-3":  [["Savings & Resilience",2]],                            // monthly savings amount
  "ES-4":  [["Savings & Resilience",3]],                            // can handle emergency
  "ES-5":  [["Savings & Resilience",2], ["Financial Inclusion",1]], // borrowing decreased

  "ES-7":  [["Livelihood & Enterprise",2]],                         // benefit helped earn income
  "ES-8":  [["Livelihood & Enterprise",3]],                         // what changed in work
  "ES-9":  [["Livelihood & Enterprise",2]],                         // benefit supports work

  "ES-10": [["Financial Inclusion",3], ["Financial Confidence",1]], // uses bank independently
  "ES-11": [["Financial Inclusion",2]],                             // knows how to check balance

  // ── WOMEN'S EMPOWERMENT ──
  "WE-1":  [["Financial Confidence",3]],                            // more independent financially
  "WE-2":  [["Financial Confidence",3]],                            // more confident managing money

  "WE-3":  [["Household Agency",3], ["Financial Confidence",1]],   // who decides spending
  "WE-4":  [["Household Agency",3]],                                // more say in decisions
  "WE-6":  [["Household Agency",2], ["Social Empowerment",1]],     // more respected

  // ── SOCIAL TRANSFORMATION ──
  "WE-9":  [["Social Empowerment",3]],                              // community group participation
  "WE-11": [["Social Empowerment",2]],                              // helped others access schemes

  "ST-1":  [["Overall Perception",3]],                              // scheme importance
  "ST-2":  [["Overall Perception",3]],                              // life improved overall
};

// Open text depth questions: flat +5 boost to relevant composites when ≥15 chars answered
const OPEN_BOOST = {
  "ST-3":  ["Consumption Quality","Savings & Resilience","Financial Confidence","Overall Perception"],
  "ST-4":  ["Overall Perception","Savings & Resilience"],
  "V-3":   ["Consumption Quality","Savings & Resilience","Livelihood & Enterprise","Financial Inclusion","Financial Confidence","Household Agency","Social Empowerment","Overall Perception"],
  "V-4":   ["Financial Confidence","Social Empowerment","Overall Perception"],
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

  // CQ-1 multi-select: each selection feeds the correct composite
  if (Array.isArray(answers["CQ-1"])) {
    const p1 = answers["CQ-1"];
    const map = [
      { items:["Food & groceries","Household expenses"], eff:"Consumption Quality", w:1 },
      { items:["Healthcare & medicine"],                  eff:"Nutrition & Health",     w:1 },
      { items:["Children's education"],                   eff:"Education",              w:1 },
      { items:["Savings"],                                eff:"Savings & Resilience",   w:2 },
      { items:["Business / income activity"],             eff:"Livelihood & Enterprise", w:1 },
      { items:["Debt or loan repayment"],                 eff:"Savings & Resilience",   w:1 },
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

  // CQ-2 multi-select: spending increases feed composites
  if (Array.isArray(answers["CQ-2"])) {
    const p2 = answers["CQ-2"];
    const map2 = [
      { item:"Food", eff:"Consumption Quality", w:1 },
      { item:"Healthcare / medicines", eff:"Nutrition & Health", w:2 },
      { item:"Children's education", eff:"Education", w:2 },
    ];
    map2.forEach(({ item, eff, w }) => {
      if (p2.includes(item)) { totals[eff] += 1.0 * w; weights[eff] += w; }
    });
    if (p2.includes("None of the above")) {
      totals["Consumption Quality"] += 0; weights["Consumption Quality"] += 1;
    }
  }

  // WE-5 multi-select: decision participation
  if (Array.isArray(answers["WE-5"])) {
    const p5 = answers["WE-5"];
    const items5 = ["Children's education","Healthcare decisions","Major household purchases"];
    const count5 = p5.filter(x => items5.includes(x)).length;
    if (count5 > 0) { totals["Household Agency"] += (count5/3) * 2; weights["Household Agency"] += 2; }
    else if (p5.includes("None of these")) { totals["Household Agency"] += 0; weights["Household Agency"] += 2; }
  }

  // WE-7 multi-select: mobility
  if (Array.isArray(answers["WE-7"])) {
    const p7 = answers["WE-7"];
    const items7 = ["Bank","Market","Work / income activity"];
    const count7 = p7.filter(x => items7.includes(x)).length;
    if (count7 > 0) { totals["Social Empowerment"] += (count7/3) * 3; weights["Social Empowerment"] += 3; }
    else if (p7.includes("None of these")) { totals["Social Empowerment"] += 0; weights["Social Empowerment"] += 3; }
  }

  // ES-12 multi-select: financial behaviours
  if (Array.isArray(answers["ES-12"])) {
    const p12 = answers["ES-12"];
    const scoreMap12 = {"Saving regularly":1.0, "Using ATM or UPI payments":1.0, "Taking a formal bank loan":0.7};
    p12.forEach(item => {
      const val = scoreMap12[item];
      if (val !== undefined) { totals["Financial Inclusion"] += val * 2; weights["Financial Inclusion"] += 2; }
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

// Rollup Rootstory scores → IIT Madras 4-dimension scores (v0.4 multi-map)
function calcIITMScores(scores) {
  const result = {};
  Object.entries(DOMAIN_COMPOSITES).forEach(([dim, composites]) => {
    const vals = composites.map(c => scores[c] ?? 0);
    result[dim] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  });
  return result;
}

// ─── PROMPT BUILDER ───────────────────────────────────────────────────────────
function buildPrompt(answers) {
  const a = answers;
  const district  = a["S4"]  || "Maharashtra";
  const village   = a["S5"]  || "";
  const occupation= a["S10"] || "not specified";
  const fundUse   = Array.isArray(a["CQ-1"]) ? a["CQ-1"].join(", ") : (a["CQ-1"]||"not recorded");

  const depthMap = {
    "ST-3":"BIGGEST BENEFIT",
    "ST-4":"PROBLEMS OR DIFFICULTIES",
    "V-4":"ANYTHING ELSE I WANT TO SAY"
  };
  const depthLines = Object.entries(depthMap)
    .filter(([id]) => a[id] && String(a[id]).trim().length > 5)
    .map(([id,label]) => `[${label}]: "${a[id]}"`)
    .join("\n");

  const extras = [
    a["ES-2"]  && `- Has savings now: ${a["ES-2"]}`,
    a["ES-3"]  && `- Monthly savings: ${a["ES-3"]}`,
    a["CQ-3"]  && `- Food quality change: ${a["CQ-3"]}`,
    a["CQ-7"]  && `- Education outcomes: ${a["CQ-7"]}`,
    a["ES-8"]  && `- Work change: ${a["ES-8"]}`,
    a["ES-10"] && `- Bank account: ${a["ES-10"]}`,
    a["WE-1"]  && `- Financial independence: ${a["WE-1"]}`,
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
Location: ${district} ${village ? `(${village})` : ""} | Occupation: ${occupation}
Used money for: ${fundUse}
Spending increases: ${Array.isArray(a["CQ-2"]) ? a["CQ-2"].join(", ") : (a["CQ-2"]||"—")}
Savings before: ${a["ES-1"]||"—"} | Savings now: ${a["ES-2"]||"—"} | Monthly: ${a["ES-3"]||"—"}
Emergency capacity: ${a["ES-4"]||"—"} | Borrowing reduced: ${a["ES-5"]||"—"}
Working: ${a["ES-7"]||"—"} | Work change: ${a["ES-8"]||"—"}
Bank account: ${a["ES-10"]||"—"} | Operates it: ${a["ES-11"]||"—"}
Independence: ${a["WE-1"]||"—"} | Confidence: ${a["WE-2"]||"—"}
Spending decisions: ${a["WE-3"]||"—"} | More say: ${a["WE-4"]||"—"}
Respect: ${a["WE-6"]||"—"} | Mobility: ${Array.isArray(a["WE-7"]) ? a["WE-7"].join(", ") : (a["WE-7"]||"—")}
Planning ahead: ${a["WE-9"]||"—"} | Local economy: ${a["WE-11"]||"—"}
Food quality: ${a["CQ-3"]||"—"} | Education: ${a["CQ-7"]||"—"}
Importance: ${a["ST-1"]||"—"} | Life improved: ${a["ST-2"]||"—"}
${extras ? `\nADDITIONAL:\n${extras}` : ""}

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

// ─── ALL QUESTIONS (fallback — DB is source of truth) ─────────────────────────
const ALL_QUESTIONS = [
  // ── SETUP: S1–S15 ──────────────────────────────────────────────────────────
  { id:"S1",  module:"setup", label:"Who is being interviewed?", type:"single", options:["Scheme beneficiary","Family member of scheme beneficiary"], required:true, researcherOnly:true },
  { id:"S2",  module:"consent", label:"Confirm consent steps below:", type:"consent", options:["I have explained the purpose of this research to the participant","The participant understands she can stop at any time","No personal information will be shared without her permission","The participant has given verbal consent to proceed"], required:true },
  { id:"S3",  module:"setup", label:"GPS Location", type:"location", required:false },
  { id:"S4",  module:"setup", label:"District", type:"select", options:MH_DISTRICTS, required:true },
  { id:"S5",  module:"setup", label:"Village / City", type:"text", required:true },
  { id:"S6",  module:"setup", label:"Settlement type of beneficiary", type:"single", researcherOnly:true, options:["Urban","Semi-urban","Rural","Tribal / forest area"], required:true },
  { id:"S7",  module:"setup", label:"Age group of beneficiary", type:"single", options:["18–25","26–35","36–45","46–55","56 and above"], required:true },
  { id:"S8",  module:"setup", label:"Marital status of beneficiary", type:"single", options:["Married","Widowed","Separated or divorced","Single / never married"], required:true },
  { id:"S9",  module:"setup", label:"Education level of beneficiary", type:"single", options:["No formal education","Primary (up to Class 5)","Secondary (Class 6–10)","Higher Secondary (Class 11–12)","Graduate or above"], required:true },
  { id:"S10", module:"setup", label:"Occupation of beneficiary", type:"single", options:["Agricultural labourer","Daily wage labourer","Small business owner or trader","Homemaker / no paid work","MGNREGS worker","Other"], required:true },
  { id:"S11", module:"setup", label:"Monthly household income (approximate)", type:"single", options:["Below ₹5,000","₹5,000–₹10,000","₹10,000–₹20,000","₹20,000–₹50,000","Above ₹50,000"], required:true },
  { id:"S12", module:"setup", label:"How long has she been receiving payments?", type:"single", options:["Less than 3 months","3–6 months","6–12 months","1 year or more"], required:true },
  { id:"S13", module:"setup", label:"How often does she receive the money?", type:"single", options:["Regularly","Sometimes","Rarely"], required:true },
  { id:"S14", module:"setup", label:"Where does she receive the money?", type:"single", options:["Bank account","Other"], required:true },
  { id:"S15", module:"setup", label:"Who helped her enrol in the scheme?", type:"single", options:["Self","Family member","Govt worker / anganwadi","Other"], required:true },

  // ── CONSUMPTION QUALITY: CQ-1 through CQ-8 ───────────────────────────────
  { id:"CQ-1", module:"core", label:"How is the ₹1500 benefit mainly spent?", hint:"Select all that apply",
    type:"multi", options:["Food & groceries","Children's education","Healthcare & medicine","Debt or loan repayment","Savings","Business / income activity","Household expenses","Personal needs","Other"], required:true },
  { id:"CQ-2", module:"core", label:"Since the ₹1500, has spending increased in any of these areas:",
    type:"multi", options:["Food","Healthcare / medicines","Children's education","None of the above"], required:true },
  { id:"CQ-3", module:"core", label:"Since the ₹1500, has her household's food quality improved?",
    type:"single", options:["Yes, much better","Yes, a little better","About the same","Worse"], required:true },
  { id:"CQ-7", module:"core", label:"Has school attendance or education outcomes improved for her children?",
    type:"single", options:["Yes, significantly","Yes, a little","About the same","No, worse","Not applicable — no children in school"], required:true },
  { id:"CQ-8", module:"core", label:"Where is the money generally spent?",
    type:"multi", options:["Local shops in her area","Markets in her area","Outside her area"], required:true },

  // ── ECONOMIC SECURITY: ES-1 through ES-12 ─────────────────────────────────
  { id:"ES-1", module:"core", label:"Before the scheme, did the beneficiary have savings?",
    type:"single", options:["Yes","No"], required:true },
  { id:"ES-2", module:"core", label:"Does she have savings now?",
    type:"single", options:["Yes","No"], required:true },
  { id:"ES-3", module:"core", label:"Approximately how much is she saving each month now?",
    type:"single", options:["None","Less than ₹500","₹500–₹1,000","More than ₹1,000"],
    conditionRule:'ES-2 = "Yes"' },
  { id:"ES-4", module:"core", label:"If an emergency expense of ₹5,000 came up, could she manage it?",
    type:"single", options:["Yes, easily","With difficulty","No"], required:true },
  { id:"ES-5", module:"core", label:"Since the scheme, is the beneficiary less dependent on borrowing?",
    type:"single", options:["Yes","Same as before","No, borrowing increased"], required:true },
  { id:"ES-7", module:"core", label:"Is the beneficiary currently working or running any income-generating activity?",
    type:"single", options:["Yes","No"], required:true },
  { id:"ES-8", module:"core", label:"Since receiving this money, has she:",
    type:"single", options:["Started working for the first time","Started a small business","No change in her work or activity"], required:true },
  { id:"ES-9", module:"core", label:"Has this money helped her with her work or income activity?",
    type:"single", options:["Yes, it helped start a new activity","Yes, it is supporting existing work","No"],
    conditionRule:'ES-7 = "Yes"' },
  { id:"ES-10", module:"core", label:"Does she have a bank account in her name?",
    type:"single", options:["Yes","No"], required:true },
  { id:"ES-11", module:"core", label:"Does she operate her bank account herself?",
    type:"single", options:["Yes","No"], conditionRule:'ES-10 = "Yes"' },
  { id:"ES-12", module:"core", label:"Since receiving this money, has she started:",
    type:"multi", options:["Saving regularly","Using ATM or UPI payments","Taking a formal bank loan"], required:true },

  // ── WOMEN'S EMPOWERMENT: WE-1 through WE-11 ──────────────────────────────
  { id:"WE-1", module:"core", label:"Is she more financially independent since the scheme?",
    type:"single", options:["Yes, much more independent","Yes, somewhat more independent","No change","Less independent than before"], required:true },
  { id:"WE-2", module:"core", label:"Has receiving this money changed her financial confidence?",
    type:"single", options:["Yes, much more confident","Yes, a little more confident","No change","Less confident"], required:true },
  { id:"WE-3", module:"core", label:"Does she personally decide how the money is spent?",
    type:"single", options:["Yes, I decide alone","Yes, jointly with my husband / partner","My husband / partner decides","Another family member decides"], required:true },
  { id:"WE-4", module:"core", label:"Has her role in household financial decisions changed since receiving this money?",
    type:"single", options:["Yes, I have much more say","Yes, a little more say","No change","Less say than before"], required:true },
  { id:"WE-5", module:"core", label:"Does she now participate in decisions about children's education, healthcare, or major household expenses?",
    type:"multi", options:["Children's education","Healthcare decisions","Major household purchases","None of these"], required:true },
  { id:"WE-6", module:"core", label:"Does she feel more respected or listened to in the household since she started receiving this payment?",
    type:"single", options:["Yes, much more","Yes, a little","No change","Less respected than before"], required:true },
  { id:"WE-7", module:"core", label:"Can she now travel alone to any of the following?",
    type:"multi", options:["Bank","Market","Work / income activity","None of these"], required:true },
  { id:"WE-9", module:"core", label:"Is she now able to plan ahead financially — saving for school fees or a seasonal expense?",
    type:"single", options:["Yes, regularly","Yes, sometimes","Not yet but she wants to","No"], required:true },
  { id:"WE-11", module:"core", label:"Has her spending helped local vendors or supported her own self-employment?",
    type:"single", options:["Yes","No"], required:true },

  // ── OVERALL PERCEPTION: ST-1 through ST-4 ─────────────────────────────────
  { id:"ST-1", module:"core", label:"How important is this ₹1,500 for her household?",
    type:"single", options:["Very important","Somewhat important","Not important"], required:true },
  { id:"ST-2", module:"core", label:"Has her life improved because of this scheme?",
    type:"single", options:["Yes, significantly","Yes, slightly","No"], required:true },
  { id:"ST-3", module:"narrative", label:"What has been the biggest benefit of this scheme for her?",
    hint:"Record her exact words", type:"open", placeholder:"Record her exact words…", badge:"🎙 Her Voice" },
  { id:"ST-4", module:"narrative", label:"What problems or difficulties, if any, does she face using this scheme?",
    hint:"Final question — record her exact words", type:"open", placeholder:"Record her exact words…", badge:"🎙 Her Voice" },

  // ── VALIDATION: V-1 through V-4 ──────────────────────────────────────────
  { id:"V-1", module:"validation", label:"narrative_display", type:"narrative_display", required:false },
  { id:"V-2", module:"validation", label:"Does this story accurately describe her experience?",
    hint:"Read it aloud to her in her language. Does she recognise herself in it?",
    type:"single", options:["Yes, this is my story","Mostly — small details to adjust","This needs to be rewritten"], required:true },
  { id:"V-3", module:"validation", label:"What would she like to correct or add?",
    type:"open", conditionRule:'V-2 ≠ "Yes, this is my story"', hint:"Record her corrections verbatim" },
  { id:"V-4", module:"validation", label:"Is there anything else she would like to add — anything the story missed?",
    type:"open", hint:"Final opportunity for her voice." },
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
  // localStorage fallback only — database loading happens in the component
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
        ...((ov.options !== undefined && (q as any).scaleLabels) ? { scaleLabels: ov.options } : {}),
      };
    });
  } catch { return questions; }
}

async function loadQuestionsFromDB(): Promise<typeof ALL_QUESTIONS | null> {
  try {
    const { data, error } = await supabase
      .from("question_schema")
      .select("questions")
      .eq("id", "default")
      .maybeSingle();
    if (error || !data?.questions) return null;
    const dbQs = data.questions as any[];
    if (!Array.isArray(dbQs) || dbQs.length === 0) return null;
    // Map DB question schema directly into the interview format — no hardcoded fallback
    return dbQs.map((q: any) => {
      const dbOpts = Array.isArray(q.options) ? q.options : [];
      return {
        id: q.id,
        module: (q.module || "Core").toLowerCase().replace("story depth","depth").replace("her voice","narrative").replace("researcher only","setup"),
        type: q.type || "single",
        label: q.label || "",
        options: dbOpts,
        scores: q.scores || {},
        hint: q.hint || "",
        always: q.always !== false,
        composite: q.composite || "",
        weight: q.weight ?? null,
        conditionRule: q.conditionRule || undefined,
        scaleLabels: q.type === "scale5" ? q.options : undefined,
        researcherDirection: q.researcherDirection || undefined,
        required: q.always !== false,
        placeholder: q.placeholder || undefined,
        researcherOnly: q.researcherOnly || false,
        depthCategory: q.depthCategory || undefined,
        badge: q.badge || undefined,
        // Map DB composite (string or JSON array) → effect array for live score badges
        effect: (() => {
          const c = q.composite;
          if (!c || c === "Setup & Consent" || c === "Narrative") return [];
          if (Array.isArray(c)) return c;
          if (typeof c === "string" && c.startsWith("[")) {
            try { return JSON.parse(c); } catch { return [c]; }
          }
          return [c];
        })(),
      };
    });
  } catch (e) {
    console.error("Failed to load questions from database:", e);
    return null;
  }
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

  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [QUESTIONS, setQUESTIONS] = useState(() => applyEditorOverrides(ALL_QUESTIONS));

  // Load questions from database, fall back to localStorage overrides
  useEffect(() => {
    (async () => {
      const dbQs = await loadQuestionsFromDB();
      if (dbQs && dbQs.length > 0) {
        setQUESTIONS(dbQs as typeof ALL_QUESTIONS);
      }
      setQuestionsLoaded(true);
    })();
  }, []);

  // Refresh queue display whenever we return to complete screen
  useEffect(() => {
    setQueue(loadQueue());
  }, [phase]);

  // Auto-sync when connection returns
  useEffect(() => {
    if (online && loadQueue().length > 0) syncQueue();
  }, [online]);

  const visibleQuestions = QUESTIONS.filter(q => {
    if (!(q as any).conditionRule) return true;
    try { return evaluateCondition((q as any).conditionRule, answers); } catch { return false; }
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
    if (current?.id === "V-1" && !narrative && !narLoading && !queued) {
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
      id: answersSnap["PID"] || Date.now().toString(),
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
        id:               String(answersSnap["PID"] || Date.now()),
        timestamp:        String(answersSnap["timestamp"] || new Date().toISOString()),
        researcher_id:    researcher?.id || null,
        district:         String(answersSnap["S1"] || ""),
        village:          String(answersSnap["S1c"] || ""),
        scheme:           String(answersSnap["S3"] || ""),
        narrative:        narrative || null,
        validated:        false,
        answers:          answersSnap,
        scores:           scoresSnap,
        impact_scores:    impactSnap,
        settlement_type:  String(answersSnap["S6"] || ""),
        income_range:     String(answersSnap["S7"] || ""),
        age_group:        String(answersSnap["S8"] || ""),
        education_level:  String(answersSnap["S9"] || ""),
        social_category:  String(answersSnap["S10"] || ""),
        marital_status:   String(answersSnap["S11"] || ""),
        household_type:   String(answersSnap["S4"]  || ""),
        livelihood:       String(answersSnap["S5"] || ""),
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
        if (record.id === answers["PID"]) {
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
        setAnswers(p => ({...p, "S2":`${loc.lat}, ${loc.lng} (±${loc.accuracy}m)`}));
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
        setAnswers({ PID:pid, timestamp:new Date().toISOString() });
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
    setAnswers({ PID:pid, timestamp:new Date().toISOString() });
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
    const depthIds = ["ES-3","ES-8","ES-21","ST-1","ST-4"];
    const depthLabels = {"ES-3":"Before Moment","ES-8":"Turning Point","ES-21":"Predictability & Dignity","ST-1":"Own Words","ST-4":"What Would Be Lost"};
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
                {[answers["PID"],answers["S1"],answers["S3"]].filter(Boolean).join(" · ")}
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
                <div style={{fontSize:10,fontWeight:"bold",color:C.grey,textTransform:"uppercase",letterSpacing:1}}>Composite → Impact Dimensions</div>
                {Object.entries(COMPOSITE_DIMS).map(([comp,dims])=>(
                  <div key={comp} style={{display:"flex",gap:8,fontSize:12,alignItems:"center"}}>
                    <span style={{color:C.teal,fontWeight:"bold",width:180,flexShrink:0}}>{comp}</span>
                    <span style={{color:C.grey,fontSize:10}}>→</span>
                    <span style={{color:C.inkLight}}>{dims.join(" · ")}</span>
                    <span style={{marginLeft:"auto",fontFamily:"monospace",fontSize:11,color:EC[comp]?.t||C.grey}}>{scores[comp]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATA TAB */}
          {activeTab==="data" && (
            <div style={{background:C.white,border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 12px 12px",display:"flex",flexDirection:"column"}}>
              {[{id:"S1",label:"Participant ID"},{id:"timestamp",label:"Timestamp"},...QUESTIONS].filter(q=>answers[q.id]).map((q,i)=>(
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
                <span style={{fontSize:12,color:C.amber,fontStyle:"italic"}}>{(current as any).depthCategory} — enriches the story</span>
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
                {((current as any).scaleLabels||["1","2","3","4","5"]).map((lbl:string,i:number)=>{
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
                style={{width:"100%",padding:"11px 14px",borderRadius:7,border:`1px solid ${C.border}`,background:C.white,fontSize:14,color:answers[current.id]?C.ink:C.grey,fontFamily:"Georgia,serif",outline:"none"}}>
                <option value="" disabled>Select…</option>
                {current.options?.filter(o => !o.includes("…")).map(o=><option key={o} value={o}>{o}</option>)}
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
