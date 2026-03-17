import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── COMPOSITE COLOUR MAP ─────────────────────────────────────────────────────
const COMPOSITES: Record<string, { bg: string; border: string; text: string }> = {
  "Household Stability":    { bg:"#E8F5EE", border:"#0D2818", text:"#071A0E" },
  "Debt & Credit Relief":   { bg:"#FEF3DC", border:"#C47A0A", text:"#8A4A00" },
  "Savings & Assets":       { bg:"#E8F8F0", border:"#2E7D52", text:"#1B5E3A" },
  "Nutrition & Health":     { bg:"#FFF0E8", border:"#C85000", text:"#8A2800" },
  "Education":              { bg:"#EEF0FF", border:"#3040C0", text:"#1A2880" },
  "Financial Confidence":   { bg:"#F0EBF8", border:"#5B3A8C", text:"#3A1A6A" },
  "Household Agency":       { bg:"#EBF4FF", border:"#1A5FA8", text:"#0D3D70" },
  "Social Empowerment":     { bg:"#FFF0F8", border:"#A0206A", text:"#700040" },
  "Financial Inclusion":    { bg:"#FFFBE6", border:"#A07800", text:"#705400" },
  "Livelihood & Enterprise":{ bg:"#E8F8F0", border:"#107048", text:"#083828" },
  "Community & Social":     { bg:"#FFF3E0", border:"#E65100", text:"#BF360C" },
  "Setup / Admin":          { bg:"#F0F4F0", border:"#8A9A8A", text:"#3A4A3A" },
  "Narrative":              { bg:"#F5F0E8", border:"#C8A060", text:"#5A3A10" },
};

const DOMAIN_COMPOSITES: Record<string, string[]> = {
  "Economic Security":              ["Household Stability", "Debt & Credit Relief", "Savings & Assets"],
  "Consumption Quality & Multiplier": ["Nutrition & Health", "Education", "Livelihood & Enterprise", "Community & Social"],
  "Women's Empowerment":            ["Financial Confidence", "Household Agency", "Social Empowerment", "Financial Inclusion"],
  "Social Transformation":          ["Social Empowerment", "Household Agency", "Community & Social"],
};

// Composite → Impact Dimensions (v0.4: a composite can feed MULTIPLE domains)
const IMPACT_DIMS: Record<string, string[]> = {
  "Household Stability":     ["Economic Security"],
  "Debt & Credit Relief":    ["Economic Security"],
  "Savings & Assets":        ["Economic Security"],
  "Nutrition & Health":      ["Consumption Quality & Multiplier"],
  "Education":               ["Consumption Quality & Multiplier"],
  "Financial Confidence":    ["Women's Empowerment"],
  "Household Agency":        ["Women's Empowerment", "Social Transformation"],
  "Social Empowerment":      ["Women's Empowerment", "Social Transformation"],
  "Financial Inclusion":     ["Women's Empowerment"],
  "Livelihood & Enterprise": ["Consumption Quality & Multiplier"],
  "Community & Social":      ["Consumption Quality & Multiplier", "Social Transformation"],
};

const LANGS = [
  { code:"en", label:"English" },
  { code:"mr", label:"मराठी" },
  { code:"hi", label:"हिन्दी" },
  { code:"ta", label:"தமிழ்" },
  { code:"te", label:"తెలుగు" },
  { code:"kn", label:"ಕನ್ನಡ" },
  { code:"gu", label:"ગુજરાતી" },
];

const SCORE_OPTS = [-0.2, 0.0, 0.3, 0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9, 1.0];
const WEIGHT_LABEL: Record<number, string> = { 1:"Supporting", 2:"Strong signal", 3:"Primary" };
const Q_TYPES = ["single","multi","scale5","text","select","open","location","consent"];
const MODULES = ["Setup","Core","Adaptive","Community","Story Depth","Her Voice","Validation","Consent","Researcher only"];

function scoreAppearance(v: number | null | undefined) {
  if (v === null || v === undefined) return { bg:"#F0F4F0", fg:"#8A9A8A", label:"—" };
  if (v >= 0.8)  return { bg:"#E8F5EE", fg:"#0D2818", label:`+${v}` };
  if (v >= 0.4)  return { bg:"#E8F8F0", fg:"#1B5E3A", label:`+${v}` };
  if (v >  0)    return { bg:"#FFFBE6", fg:"#705400", label:`+${v}` };
  if (v === 0)   return { bg:"#F0F4F0", fg:"#8A9A8A", label:"0" };
  return               { bg:"#FDECEA", fg:"#8A1A10", label:`${v}` };
}

interface Question {
  id: string;
  composite: string | string[];
  module: string;
  weight: number | null;
  always: boolean;
  type: string;
  label: string;
  options: string[];
  scores?: Record<string, number>;
  hint: string;
  adminComment?: string;
  researcherDirection?: string;
  conditionRule?: string;
}

function getComposites(q: Question): string[] {
  return Array.isArray(q.composite) ? q.composite : [q.composite];
}
function getPrimaryComposite(q: Question): string {
  return Array.isArray(q.composite) ? q.composite[0] : q.composite;
}

// ─── COMPLETE QUESTION DATA ───────────────────────────────────────────────────
const INITIAL_QS: Question[] = [
  // SETUP — S1 through S12
  { id:"S1",   composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"select",   label:"District",                                                   options:[],  hint:"Part of S1 composite location", scores:{} },
  { id:"S1c",  composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"text",     label:"Village / Area",                                             options:[],  hint:"Part of S1 composite location", scores:{} },
  { id:"S2",   composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"location", label:"GPS Location",                                               options:[],  hint:"Auto-capture from device", scores:{} },
  { id:"C1",   composite:"Setup / Admin",  module:"Consent",         weight:null, always:true,  type:"consent",  label:"Consent confirmed",                                          options:[],  hint:"Required — shown after GPS capture", scores:{} },
  { id:"S3",   composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"select",   label:"Which DBT scheme is she receiving?",                          options:["Mukhyamantri Majhi Ladki Bahin Yojana (₹1,500/month)","Ladki Bahin — Enhanced rate","Widow & Destitute Women Pension","Divyang (Disability) Pension — Women","PM Matru Vandana Yojana (PMMVY)","Janani Suraksha Yojana (JSY)","Pradhan Mantri Awas Yojana — Women beneficiary","Namo Shetkari Mahila Scheme","Other Women's DBT Scheme"],  hint:"", scores:{} },
  { id:"S4",   composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"single",   label:"What is her household situation?",                            options:["Lives alone","Nuclear family (herself, husband, children)","Joint family (with in-laws or extended family)","Female-headed household (no male earner)"],  hint:"", scores:{} },
  { id:"S5",   composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"single",   label:"What is the main way her household earns income?",             options:["Agriculture (own land)","Agricultural labour","Daily wage labour","Small business / trade","MGNREGS work","No paid work","Other"],  hint:"", scores:{} },
  { id:"S6",   composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Settlement type",                                            options:["Urban","Semi-urban","Rural","Tribal / forest area"],  hint:"Researcher observes — not asked to participant", scores:{}, researcherDirection:"Researcher fills — observe, do not ask participant" },
  { id:"S7",   composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Monthly household income (approx)",                          options:["Below ₹5,000","₹5,000–10,000","₹10,000–20,000","Above ₹20,000","Prefer not to say"],  hint:"Researcher estimates from records", scores:{}, researcherDirection:"Researcher fills — estimate from household observation or records" },
  { id:"S8",   composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Age group",                                                  options:["18–25","26–35","36–45","46–55","56 and above"],  hint:"", scores:{}, researcherDirection:"Researcher fills from observation or records" },
  { id:"S9",   composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Education level",                                            options:["No formal education","Primary (up to Class 5)","Secondary (Class 6–10)","Higher Secondary (Class 11–12)","Graduate or above"],  hint:"", scores:{}, researcherDirection:"Researcher fills from records" },
  { id:"S10",  composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Social category",                                            options:["SC (Scheduled Caste)","ST (Scheduled Tribe)","OBC (Other Backward Class)","General / Open","Prefer not to say"],  hint:"From beneficiary records", scores:{}, researcherDirection:"From beneficiary records — do not ask directly" },
  { id:"S11",  composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Marital status",                                             options:["Married","Widowed","Separated / divorced","Single / never married"],  hint:"", scores:{}, researcherDirection:"Researcher fills from records" },
  { id:"S12",  composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Children under 18 in household",                             options:["None","1","2","3 or more"],  hint:"", scores:{}, researcherDirection:"Researcher fills from observation" },

  // CONSUMPTION QUALITY — CQ-1 through CQ-14
  { id:"CQ-1",  composite:"Household Stability",    module:"Core",      weight:1, always:true,  type:"multi",   label:"How did she mainly use the DBT money she received?",  options:["Food & household groceries","Children's school fees or books","Healthcare or medicines","Repaying a loan or debt","Savings","Starting or running a business or farm activity","Clothing or household items","Other"],  scores:{"Food & household groceries":0.5,"Children's school fees or books":0.5,"Healthcare or medicines":0.5,"Repaying a loan or debt":0.5,"Savings":1.0,"Starting or running a business or farm activity":0.5,"Clothing or household items":0.3,"Other":0.0},  hint:"Each item routes to its own composite" },
  { id:"CQ-2",  composite:["Household Stability","Debt & Credit Relief","Savings & Assets","Financial Confidence","Community & Social"],  module:"Core",  weight:1, always:true,  type:"open",    label:"In her own words — what is the single most important thing this money has done for her?",  options:[],  hint:"Depth boost +5 across composites when answered", scores:{} },
  { id:"CQ-3",  composite:"Nutrition & Health",     module:"Core",      weight:3, always:true,  type:"single",  label:"In the last 6 months, did her household spend more on healthcare or medicines than before DBT?",  options:["Yes, significantly more","Yes, a little more","About the same","Less"],  scores:{"Yes, significantly more":1.0,"Yes, a little more":0.65,"About the same":0.2,"Less":0.0},  hint:"" },
  { id:"CQ-4",  composite:"Nutrition & Health",     module:"Core",      weight:3, always:true,  type:"single",  label:"Has the quality or quantity of food her household eats improved since she started receiving this money?",  options:["Yes, much better","Yes, a little better","About the same","Worse"],  scores:{"Yes, much better":1.0,"Yes, a little better":0.65,"About the same":0.2,"Worse":0.0},  hint:"" },
  { id:"CQ-5",  composite:"Education",              module:"Core",      weight:3, always:true,  type:"single",  label:"Has she been able to spend more on her children's education — fees, books, uniforms, or tuition?",  options:["Yes, significantly more","Yes, a little more","No change","Not applicable — no children in school"],  scores:{"Yes, significantly more":1.0,"Yes, a little more":0.65,"No change":0.1,"Not applicable — no children in school":0.4},  hint:"" },
  { id:"CQ-6",  composite:"Savings & Assets",       module:"Core",      weight:2, always:true,  type:"single",  label:"If she were to estimate — what share of the DBT money did she spend on things that will help her household grow?",  options:["Most of it (more than half)","About half","Less than half","Almost none — it covers daily survival"],  scores:{"Most of it (more than half)":1.0,"About half":0.65,"Less than half":0.3,"Almost none — it covers daily survival":0.0},  hint:"" },
  { id:"CQ-7",  composite:"Livelihood & Enterprise", module:"Adaptive",  weight:null, always:false, type:"multi",  label:"What type of livelihood or farm activity did she use the money for?",  options:["Seeds or fertiliser","Livestock or poultry","Small shop or trade","Tools or equipment","Skills or training","Other"],  hint:"Shown if CQ-1 includes business/farm. Context only.", scores:{}, conditionRule:'CQ-1 includes "Starting or running a business or farm activity" OR "Agricultural labour"' },
  { id:"CQ-8",  composite:"Livelihood & Enterprise", module:"Adaptive",  weight:3, always:false, type:"single",  label:"Did this activity generate income or improve the household's productive capacity?",  options:["Yes, generating regular income","Yes, some additional income","Not yet but she expects it to","No income generated"],  scores:{"Yes, generating regular income":1.0,"Yes, some additional income":0.65,"Not yet but she expects it to":0.3,"No income generated":0.0},  hint:"Shown if CQ-1 includes business/farm.", conditionRule:'CQ-1 includes "Starting or running a business or farm activity"' },
  { id:"CQ-9",  composite:"Livelihood & Enterprise", module:"Adaptive",  weight:2, always:false, type:"single",  label:"Did this activity create paid work for others in her household or community?",  options:["Yes, for household members","Yes, for community members","No"],  scores:{"Yes, for household members":0.8,"Yes, for community members":1.0,"No":0.0},  hint:"Also feeds Community & Social wt 1.", conditionRule:'CQ-1 includes "Starting or running a business or farm activity"' },
  { id:"CQ-10", composite:"Livelihood & Enterprise", module:"Adaptive",  weight:2, always:false, type:"single",  label:"Does she plan to continue or expand this activity in the next 6 months?",  options:["Yes, expand","Yes, continue at same level","Uncertain","No"],  scores:{"Yes, expand":1.0,"Yes, continue at same level":0.65,"Uncertain":0.3,"No":0.0},  hint:"", conditionRule:'CQ-1 includes "Starting or running a business or farm activity"' },
  { id:"CQ-11", composite:"Community & Social",      module:"Community",  weight:3, always:true,  type:"single",  label:"Since receiving this payment, has she been spending more at local shops, markets, or with local vendors?",  options:["Yes, spending more","About the same","Spending less locally"],  scores:{"Yes, spending more":1.0,"About the same":0.0,"Spending less locally":0.0},  hint:"" },
  { id:"CQ-12", composite:"Community & Social",      module:"Community",  weight:2, always:true,  type:"single",  label:"Has she been able to provide financial support to other family members, relatives, or neighbours?",  options:["Yes, regularly","Yes, occasionally","No"],  scores:{"Yes, regularly":1.0,"Yes, occasionally":0.6,"No":0.0},  hint:"" },
  { id:"CQ-13", composite:"Community & Social",      module:"Community",  weight:2, always:true,  type:"single",  label:"Has she become more active in community activities, SHGs, or local women's groups since receiving this payment?",  options:["Yes, more active","About the same","Less active"],  scores:{"Yes, more active":1.0,"About the same":0.3,"Less active":0.0},  hint:"" },
  { id:"CQ-14", composite:"Community & Social",      module:"Adaptive",   weight:null, always:false, type:"open",   label:"Have there been any changes for her family or neighbours since women started receiving this payment?",  options:[],  hint:"Shown if CQ-11=spending more or CQ-13=more active.", scores:{}, conditionRule:'CQ-11 = "Yes, spending more" OR CQ-13 = "Yes, more active"' },

  // ECONOMIC SECURITY — ES-1 through ES-22
  { id:"ES-1",  composite:"Household Stability",  module:"Core",        weight:1, always:true,  type:"scale5",  label:"Before receiving this money, how difficult was it to cover essential household expenses each month?",  options:["Very difficult","Difficult","Neither easy nor hard","Easy","Very easy"],  scores:{"1":1.0,"2":0.75,"3":0.5,"4":0.25,"5":0.0},  hint:"Baseline context." },
  { id:"ES-2",  composite:"Household Stability",  module:"Core",        weight:3, always:true,  type:"scale5",  label:"Since receiving this money, how difficult is it now to cover essential household expenses each month?",  options:["Very difficult","Difficult","Neither easy nor hard","Easy","Very easy"],  scores:{"1":0.0,"2":0.25,"3":0.5,"4":0.75,"5":1.0},  hint:"Current state — inverted scoring from ES-1." },
  { id:"ES-3",  composite:"Household Stability",  module:"Story Depth", weight:1, always:false,  type:"open",    label:"Tell me about a specific time before this money came when she could not manage an expense. What happened?",  options:[],  hint:"Depth boost +5 to Stability + Debt.", scores:{}, conditionRule:'ES-1 ∈ {1, 2, 3} (reported difficulty before)' },
  { id:"ES-4",  composite:"Household Stability",  module:"Core",        weight:3, always:true,  type:"single",  label:"Since receiving this payment, have her household expenses become more stable month to month?",  options:["Yes, much more stable","Yes, somewhat more stable","No change","No, less stable"],  scores:{"Yes, much more stable":1.0,"Yes, somewhat more stable":0.6,"No change":0.2,"No, less stable":0.0},  hint:"" },
  { id:"ES-5",  composite:"Household Stability",  module:"Core",        weight:null, always:true,  type:"single",  label:"In the last 6 months, did she experience an unexpected financial shock?",  options:["Yes","No"],  scores:{"Yes":0.0,"No":0.0},  hint:"Gate — triggers ES-6 if Yes, ES-6b if No." },
  { id:"ES-6",  composite:"Household Stability",  module:"Core",        weight:2, always:false, type:"single",  label:"Was she able to manage it without borrowing at high interest?",  options:["Yes, managed without borrowing","Yes, but had to borrow","No, could not manage it"],  scores:{"Yes, managed without borrowing":1.0,"Yes, but had to borrow":0.4,"No, could not manage it":0.0},  hint:"Path A: actual shock. Feeds Debt & Credit Relief wt 1.", conditionRule:'ES-5 = "Yes"' },
  { id:"ES-6b", composite:"Household Stability",  module:"Core",        weight:2, always:false, type:"single",  label:"If she does experience a sudden financial shock in the future — do you think she'd be able to manage without borrowing?",  options:["Yes, she's confident she could","Maybe, depends on the size","Probably not","Don't know / uncertain"],  scores:{"Yes, she's confident she could":1.0,"Maybe, depends on the size":0.6,"Probably not":0.0,"Don't know / uncertain":0.3},  hint:"Path B: perceived capacity. Feeds Debt & Credit Relief wt 1.", conditionRule:'ES-5 = "No"' },
  { id:"ES-7",  composite:"Household Stability",  module:"Core",        weight:2, always:true,  type:"single",  label:"Has the DBT payment given her more breathing room during month-end?",  options:["Yes, significantly more breathing room","Yes, a little more breathing room","No difference","Less breathing room than before"],  scores:{"Yes, significantly more breathing room":1.0,"Yes, a little more breathing room":0.6,"No difference":0.2,"Less breathing room than before":0.0},  hint:"Subjective ease during crunch times." },
  { id:"ES-8",  composite:"Household Stability",  module:"Story Depth", weight:1, always:false, type:"open",    label:"Was there a specific month or moment when she felt things were different because of this payment?",  options:[],  hint:"Depth boost +5.", scores:{}, conditionRule:'ES-4 ≠ "No change" OR ES-7 = "Yes, significantly…" or "Yes, a little…"' },
  { id:"ES-9",  composite:"Debt & Credit Relief", module:"Core",        weight:1, always:true,  type:"single",  label:"Before receiving this money, how often did she borrow from a moneylender or informal lender?",  options:["Never","Rarely — once or twice a year","Sometimes — every few months","Often — every month or more"],  scores:{"Never":0.0,"Rarely — once or twice a year":0.3,"Sometimes — every few months":0.6,"Often — every month or more":1.0},  hint:"Baseline context." },
  { id:"ES-10", composite:"Debt & Credit Relief", module:"Core",        weight:3, always:false, type:"single",  label:"Since receiving this money, how has that borrowing changed?",  options:["Stopped completely","Reduced significantly","Reduced a little","No change","Increased"],  scores:{"Stopped completely":1.0,"Reduced significantly":0.75,"Reduced a little":0.4,"No change":0.1,"Increased":0.0},  hint:"Shown if ES-9 ≠ Never.", conditionRule:'ES-9 ≠ "Never"' },
  { id:"ES-11", composite:"Debt & Credit Relief", module:"Story Depth", weight:1, always:false, type:"open",    label:"Before this money came, where did that money come from? Who did she go to, and what did it cost her?",  options:[],  hint:"Shown if borrowing reduced. Depth boost +5.", scores:{}, conditionRule:'ES-10 ∈ {"Stopped completely", "Reduced significantly", "Reduced a little"}' },
  { id:"ES-12", composite:"Debt & Credit Relief", module:"Core",        weight:2, always:false, type:"single",  label:"Has this money helped her avoid taking a high-interest loan in the last year?",  options:["Yes, avoided at least one loan","Possibly","No","Not applicable"],  scores:{"Yes, avoided at least one loan":1.0,"Possibly":0.5,"No":0.0,"Not applicable":0.3},  hint:"Shown if ES-9 ≠ Never.", conditionRule:'ES-9 ≠ "Never"' },
  { id:"ES-13", composite:"Debt & Credit Relief", module:"Core",        weight:2, always:true,  type:"single",  label:"How would she describe her overall financial management now compared to before?",  options:["Much better","Somewhat better","About the same","Worse"],  scores:{"Much better":1.0,"Somewhat better":0.65,"About the same":0.25,"Worse":0.0},  hint:"" },
  { id:"ES-14", composite:"Debt & Credit Relief", module:"Adaptive",    weight:null, always:false, type:"multi",  label:"What type of debt did she repay with this money?",  options:["Moneylender","Microfinance / SHG loan","Bank loan","Family or friend","Other"],  hint:"Context only. Shown if CQ-1 includes debt + ES-10 shows reduction.", scores:{}, conditionRule:'CQ-1 includes "Repaying a loan or debt" AND ES-10 ∈ {reduced…}' },
  { id:"ES-15", composite:"Debt & Credit Relief", module:"Adaptive",    weight:2, always:false, type:"single",  label:"Has she been able to reduce the total amount of debt her household carries?",  options:["Yes, significantly reduced","Yes, somewhat reduced","No change","Debt has increased"],  scores:{"Yes, significantly reduced":1.0,"Yes, somewhat reduced":0.65,"No change":0.2,"Debt has increased":0.0},  hint:"", conditionRule:'CQ-1 includes "Repaying a loan or debt" AND ES-10 ∈ {reduced…}' },
  { id:"ES-16", composite:"Debt & Credit Relief", module:"Adaptive",    weight:2, always:false, type:"single",  label:"Does she feel less dependent on borrowing to get through the month now?",  options:["Yes, much less dependent","Yes, a little less","About the same","More dependent"],  scores:{"Yes, much less dependent":1.0,"Yes, a little less":0.6,"About the same":0.2,"More dependent":0.0},  hint:"", conditionRule:'CQ-1 includes "Repaying a loan or debt" AND ES-10 ∈ {reduced…}' },
  { id:"ES-17", composite:"Savings & Assets",     module:"Core",        weight:3, always:true,  type:"single",  label:"Has she started saving a portion of the DBT money regularly, even a small amount?",  options:["Yes, saving regularly","Yes, saving occasionally","Tried but couldn't","No"],  scores:{"Yes, saving regularly":1.0,"Yes, saving occasionally":0.65,"Tried but couldn't":0.3,"No":0.0},  hint:"" },
  { id:"ES-18", composite:"Savings & Assets",     module:"Core",        weight:2, always:true,  type:"single",  label:"Has she purchased any asset since receiving this money — livestock, a tool, furniture, or anything of lasting value?",  options:["Yes, multiple assets","Yes, one asset","No"],  scores:{"Yes, multiple assets":1.0,"Yes, one asset":0.7,"No":0.0},  hint:"" },
  { id:"ES-19", composite:"Financial Inclusion",   module:"Core",        weight:3, always:true,  type:"single",  label:"How often does she use her bank account now compared to before receiving DBT?",  options:["I use it regularly now — didn't before","I use it more than before","About the same as before","I don't have or use a bank account"],  scores:{"I use it regularly now — didn't before":1.0,"I use it more than before":0.7,"About the same as before":0.3,"I don't have or use a bank account":0.0},  hint:"" },
  { id:"ES-20", composite:"Financial Inclusion",   module:"Core",        weight:3, always:true,  type:"single",  label:"Has she started doing anything specific to manage her money better — keeping a record, setting aside money, or using a savings group?",  options:["Yes, I keep a record or budget","Yes, I set aside money for specific purposes","Yes, I use an SHG or savings group","No specific practice"],  scores:{"Yes, I keep a record or budget":1.0,"Yes, I set aside money for specific purposes":0.8,"Yes, I use an SHG or savings group":0.7,"No specific practice":0.0},  hint:"" },
  { id:"ES-21", composite:"Financial Confidence",  module:"Story Depth", weight:1, always:false, type:"open",    label:"How does it feel to know that a payment is coming on a fixed date? Has that changed anything about how she thinks about the future?",  options:[],  hint:"Depth boost +5 to Financial Confidence, Household Agency.", scores:{}, conditionRule:'WE-1 ≥ 4 OR WE-2 = "Yes, much more…" or "Yes, a little…" OR ES-2 = 5' },
  { id:"ES-22", composite:"Financial Inclusion",   module:"Adaptive",    weight:null, always:false, type:"multi",  label:"What prevents her from using the bank account more often?",  options:["Fear or distrust of banks","Lacks understanding of how to use it","Insufficient balance to maintain account","Bank location or hours are inconvenient","Prefers to keep cash at home","Husband or family member controls the account","No specific barrier","Other"],  hint:"Diagnostic only. Shown if ES-19 < regular use.", scores:{}, conditionRule:'ES-19 ≠ "I use it regularly now — didn\'t before"' },

  // WOMEN'S EMPOWERMENT — WE-1 through WE-12
  { id:"WE-1",  composite:"Financial Confidence",  module:"Core",        weight:3, always:true,  type:"scale5",  label:"On a scale of 1–5, how confident does she feel in managing her household's finances today?",  options:["1 — Not at all confident","2","3","4","5 — Very confident"],  scores:{"1":0.0,"2":0.25,"3":0.5,"4":0.75,"5":1.0},  hint:"" },
  { id:"WE-2",  composite:"Financial Confidence",  module:"Core",        weight:3, always:true,  type:"single",  label:"Has receiving this money changed how confident she feels about managing money?",  options:["Yes, much more confident","Yes, a little more confident","No change","Less confident"],  scores:{"Yes, much more confident":1.0,"Yes, a little more confident":0.65,"No change":0.2,"Less confident":0.0},  hint:"" },
  { id:"WE-3",  composite:"Household Agency",      module:"Core",        weight:3, always:true,  type:"single",  label:"Does she personally decide how the money is spent?",  options:["Yes, I decide alone","Yes, jointly with my husband","My husband decides","Another family member decides"],  scores:{"Yes, I decide alone":1.0,"Yes, jointly with my husband":0.8,"My husband decides":0.0,"Another family member decides":0.0},  hint:"Gating: 0.0 for husband/family." },
  { id:"WE-4",  composite:"Household Agency",      module:"Core",        weight:3, always:true,  type:"single",  label:"Does she feel she has more say in how the household money is spent since receiving this payment?",  options:["Yes, a lot more","Yes, a little more","No change","Less say than before"],  scores:{"Yes, a lot more":1.0,"Yes, a little more":0.6,"No change":0.2,"Less say than before":0.0},  hint:"" },
  { id:"WE-5",  composite:"Household Agency",      module:"Core",        weight:2, always:true,  type:"single",  label:"Is she now able to plan ahead financially — saving for school fees or a seasonal expense?",  options:["Yes, regularly","Yes, sometimes","Not yet but she wants to","No"],  scores:{"Yes, regularly":1.0,"Yes, sometimes":0.65,"Not yet but she wants to":0.3,"No":0.0},  hint:"" },
  { id:"WE-6",  composite:"Household Agency",      module:"Adaptive",    weight:null, always:false, type:"single",  label:"Does the DBT payment come directly to her account?",  options:["Yes, directly to my account","Shared account with husband","Goes to husband's account","Goes to another family member"],  hint:"Shown if WE-4 positive. Context only.", scores:{}, conditionRule:'WE-4 = "Yes, a lot more" OR "Yes, a little more"' },
  { id:"WE-7",  composite:"Household Agency",      module:"Adaptive",    weight:2, always:false, type:"single",  label:"Has her role in household financial decisions changed since receiving this money?",  options:["Yes, I have much more say","Yes, a little more say","No change","Less say"],  scores:{"Yes, I have much more say":1.0,"Yes, a little more say":0.6,"No change":0.2,"Less say":0.0},  hint:"Shown if WE-4 positive.", conditionRule:'WE-4 = "Yes, a lot more" OR "Yes, a little more"' },
  { id:"WE-8",  composite:"Household Agency",      module:"Core",        weight:1, always:true,  type:"single",  label:"Does she feel more respected or listened to in the household since she started receiving this payment?",  options:["Yes, much more","Yes, a little","No change","Less respected"],  scores:{"Yes, much more":1.0,"Yes, a little":0.6,"No change":0.2,"Less respected":0.0},  hint:"" },
  { id:"WE-9",  composite:"Social Empowerment",    module:"Core",        weight:3, always:true,  type:"single",  label:"Since receiving this payment, does she feel freer to move around — to attend meetings, visit family, go to the market?",  options:["Yes, much freer","Yes, somewhat freer","No change","Less free than before"],  scores:{"Yes, much freer":1.0,"Yes, somewhat freer":0.65,"No change":0.2,"Less free than before":0.0},  hint:"" },
  { id:"WE-10", composite:"Social Empowerment",    module:"Core",        weight:3, always:true,  type:"single",  label:"How has her sense of her own worth or standing changed since she started receiving this money?",  options:["I feel much more valued","I feel somewhat more valued","No change","I feel less valued"],  scores:{"I feel much more valued":1.0,"I feel somewhat more valued":0.65,"No change":0.2,"I feel less valued":0.0},  hint:"" },
  { id:"WE-11", composite:"Social Empowerment",    module:"Core",        weight:2, always:true,  type:"single",  label:"Has the attitude of her husband or other family members toward her changed since she started receiving this money?",  options:["Yes, they respect me more","Yes, they consult me more on decisions","No change","The relationship has become more difficult"],  scores:{"Yes, they respect me more":1.0,"Yes, they consult me more on decisions":0.8,"No change":0.2,"The relationship has become more difficult":0.0},  hint:"" },
  { id:"WE-12", composite:"Social Empowerment",    module:"Core",        weight:2, always:true,  type:"single",  label:"Does she feel more financially independent — less dependent on her husband or family?",  options:["Yes, much more independent","Yes, somewhat more independent","No change","More dependent than before"],  scores:{"Yes, much more independent":1.0,"Yes, somewhat more independent":0.65,"No change":0.2,"More dependent than before":0.0},  hint:"" },

  // SOCIAL TRANSFORMATION — ST-1 through ST-4
  { id:"ST-1",  composite:"Narrative",              module:"Her Voice",   weight:null, always:true,  type:"open",    label:"How has her reliance on others changed since Ladki Bahin? Does she feel more independent?",  options:[],  hint:"Record exact language.", scores:{} },
  { id:"ST-2",  composite:"Community & Social",     module:"Community",   weight:2, always:true,  type:"single",  label:"Since receiving Ladki Bahin, does she feel her position or standing in her community has changed?",  options:["Yes, she feels more respected","About the same","She feels less respected"],  scores:{"Yes, she feels more respected":1.0,"About the same":0.3,"She feels less respected":0.0},  hint:"" },
  { id:"ST-3",  composite:"Community & Social",     module:"Community",   weight:2, always:true,  type:"single",  label:"Since receiving Ladki Bahin, has she been able to provide support — financial or practical — to another woman, relative, or neighbour?",  options:["Yes, regularly","Yes, occasionally","No"],  scores:{"Yes, regularly":1.0,"Yes, occasionally":0.55,"No":0.0},  hint:"" },
  { id:"ST-4",  composite:"Narrative",              module:"Her Voice",   weight:null, always:true,  type:"open",    label:"If this payment stopped tomorrow — what is the first thing in her life that would be affected?",  options:[],  hint:"Reveals what matters most.", scores:{} },

  // VALIDATION — V-2 through V-4
  { id:"V-2",   composite:"Narrative",              module:"Validation",  weight:null, always:true,  type:"single",  label:"Does this story accurately describe her experience?",  options:["Yes, this is my story","Mostly — small details to adjust","This needs to be rewritten"],  hint:"Read narrative aloud to her in her language.", scores:{} },
  { id:"V-3",   composite:"Narrative",              module:"Validation",  weight:null, always:false, type:"open",    label:"What would she like to correct or add?",  options:[],  hint:"Shown if V-2 = needs adjustment. Record verbatim.", scores:{}, conditionRule:'V-2 = "Mostly — small details to adjust" OR "This needs to be rewritten"' },
  { id:"V-4",   composite:"Narrative",              module:"Validation",  weight:null, always:true,  type:"open",    label:"Is there anything else she would like to add — anything the story missed?",  options:[],  hint:"Final opportunity for her voice.", scores:{} },
];

type TranslationStore = Record<string, Record<string, { label?: string; opts?: Record<string, string> }>>;

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function QuestionEditor() {
  const [questions,  setQuestions]  = useState<Question[]>(INITIAL_QS);
  const [filterComp, setFilterComp] = useState("All");
  const [search,     setSearch]     = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lang,       setLang]       = useState("en");
  const [trans,      setTrans]      = useState<TranslationStore>({});
  const [viewMode,   setViewMode]   = useState<"list"|"matrix"|"branching">("list");
  const [flash,      setFlash]      = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [loaded,     setLoaded]     = useState(false);
  const [globalEdit, setGlobalEdit] = useState(false);
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());

  // Load questions & translations from database on mount
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("question_schema")
          .select("questions, translations")
          .eq("id", "default")
          .maybeSingle();
        if (error) { console.error("Failed to load question schema:", error); return; }
        if (data) {
          if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            setQuestions(data.questions as unknown as Question[]);
          }
          if (data.translations && typeof data.translations === "object" && Object.keys(data.translations).length > 0) {
            setTrans(data.translations as unknown as TranslationStore);
          }
        }
      } catch (e) { console.error("Error loading question schema:", e); }
      finally { setLoaded(true); }
    })();
  }, []);

  const toggleEditQ = (id: string) => {
    setEditingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isEditing = (id: string) => globalEdit || editingIds.has(id);

  const visible = questions.filter(q => {
    const mc = filterComp === "All" || q.composite === filterComp;
    const s  = search.toLowerCase();
    const ms = !s || q.id.toLowerCase().includes(s) || q.label.toLowerCase().includes(s);
    return mc && ms;
  });

  const getTr = (qid: string, type: string, opt?: string): string => lang === "en" ? "" :
    (type === "label" ? trans[lang]?.[qid]?.label : trans[lang]?.[qid]?.opts?.[opt||""]) || "";

  const setTr = (qid: string, type: string, opt: string | null, val: string) =>
    setTrans(p => ({
      ...p,
      [lang]: {
        ...(p[lang]||{}),
        [qid]: type === "label"
          ? { ...(p[lang]?.[qid]||{}), label: val }
          : { ...(p[lang]?.[qid]||{}), opts: { ...(p[lang]?.[qid]?.opts||{}), [opt||""]: val } }
      }
    }));

  const updateScore  = useCallback((qid: string, key: string, val: number) =>
    setQuestions(qs => qs.map(q => q.id !== qid ? q : { ...q, scores: { ...(q.scores||{}), [key]: val } })), []);
  const updateLabel  = useCallback((qid: string, val: string) =>
    setQuestions(qs => qs.map(q => q.id !== qid ? q : { ...q, label: val })), []);
  const updateOpt    = useCallback((qid: string, old: string, nw: string) =>
    setQuestions(qs => qs.map(q => {
      if (q.id !== qid) return q;
      const opts = q.options.map(o => o === old ? nw : o);
      const sc   = Object.fromEntries(Object.entries(q.scores||{}).map(([k,v]) => [k===old?nw:k, v]));
      return { ...q, options:opts, scores:sc };
    })), []);

  const updateField = useCallback((qid: string, field: keyof Question, val: any) =>
    setQuestions(qs => qs.map(q => q.id !== qid ? q : { ...q, [field]: val })), []);

  const addOption = useCallback((qid: string) =>
    setQuestions(qs => qs.map(q => {
      if (q.id !== qid) return q;
      const newOpt = `Option ${q.options.length + 1}`;
      return { ...q, options: [...q.options, newOpt], scores: { ...(q.scores||{}), [newOpt]: 0.0 } };
    })), []);

  const removeOption = useCallback((qid: string, opt: string) =>
    setQuestions(qs => qs.map(q => {
      if (q.id !== qid) return q;
      const opts = q.options.filter(o => o !== opt);
      const sc = { ...(q.scores||{}) };
      delete sc[opt];
      return { ...q, options: opts, scores: sc };
    })), []);

  const moveQuestion = useCallback((qid: string, dir: -1 | 1) =>
    setQuestions(qs => {
      const idx = qs.findIndex(q => q.id === qid);
      if (idx < 0) return qs;
      const target = idx + dir;
      if (target < 0 || target >= qs.length) return qs;
      const next = [...qs];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    }), []);

  const deleteQuestion = useCallback((qid: string) =>
    setQuestions(qs => qs.filter(q => q.id !== qid)), []);

  const addQuestion = useCallback((afterId?: string) => {
    const newQ: Question = {
      id: `NEW_${Date.now().toString(36).toUpperCase()}`,
      composite: "Setup / Admin",
      module: "Core",
      weight: null,
      always: true,
      type: "single",
      label: "New question",
      options: [],
      scores: {},
      hint: "",
      adminComment: "",
      researcherDirection: "",
    };
    setQuestions(qs => {
      if (!afterId) return [...qs, newQ];
      const idx = qs.findIndex(q => q.id === afterId);
      if (idx < 0) return [...qs, newQ];
      const next = [...qs];
      next.splice(idx + 1, 0, newQ);
      return next;
    });
    setExpandedId(newQ.id);
    setEditingIds(prev => new Set(prev).add(newQ.id));
  }, []);

  const duplicateQuestion = useCallback((qid: string) => {
    setQuestions(qs => {
      const idx = qs.findIndex(q => q.id === qid);
      if (idx < 0) return qs;
      const src = qs[idx];
      const newId = `${src.id}_DUP_${Date.now().toString(36).slice(-3).toUpperCase()}`;
      const dup: Question = { ...src, id: newId };
      const next = [...qs];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  }, []);

  const handleExport = () => {
    const SCREEN_SIZE = 6;
    const scorableQs  = questions.filter(q => q.type !== "location" && q.type !== "consent" && q.type !== "open");
    const chunks: Question[][] = [];
    for (let i = 0; i < scorableQs.length; i += SCREEN_SIZE)
      chunks.push(scorableQs.slice(i, i + SCREEN_SIZE));

    const getLang = (qid: string, key: "label"): string =>
      (lang !== "en" && trans[lang]?.[qid]?.label) ? trans[lang][qid].label! : "";
    const getOptLang = (qid: string, opt: string): string =>
      (lang !== "en" && trans[lang]?.[qid]?.opts?.[opt]) ? trans[lang][qid].opts![opt] : "";

    const buildDataSource = (q: Question) =>
      q.options.map((opt, idx) => ({
        id: `${q.id}_opt_${idx}`,
        title: (getOptLang(q.id, opt) || opt),
        ...(q.scores && q.scores[opt] !== undefined
          ? { metadata: { score: q.scores[opt], composite: q.composite } }
          : {}),
      }));

    const buildChildren = (qs: Question[]) => {
      const children: object[] = [];
      qs.forEach(q => {
        const displayLabel = getLang(q.id, "label") || q.label;
        if (q.type === "multi") {
          children.push({ type: "CheckboxGroup", label: displayLabel, name: q.id, required: q.always, "data-source": buildDataSource(q), ...(q.hint ? { description: q.hint } : {}) });
        } else if (q.type === "single" || q.type === "scale5") {
          children.push({ type: "RadioButtonsGroup", label: displayLabel, name: q.id, required: q.always, "data-source": buildDataSource(q), ...(q.hint ? { description: q.hint } : {}) });
        } else if (q.type === "text") {
          children.push({ type: "TextInput", label: displayLabel, name: q.id, required: q.always, "input-type": "text" });
        } else if (q.type === "select") {
          children.push({ type: "Dropdown", label: displayLabel, name: q.id, required: q.always, "data-source": buildDataSource(q) });
        }
      });
      return children;
    };

    const screenIds = chunks.map((_, i) => `SCREEN_${String(i + 1).padStart(2, "0")}`);
    const routingModel: Record<string, string[]> = {};
    screenIds.forEach((sid, i) => { routingModel[sid] = i < screenIds.length - 1 ? [screenIds[i + 1]] : []; });

    const screens = chunks.map((qs, i) => {
      const sid = screenIds[i];
      const isLast = i === chunks.length - 1;
      const compositeSet = [...new Set(qs.map(q => q.composite))];
      const children = buildChildren(qs);
      const formChildren: object[] = [
        ...children,
        { type: "Footer", label: isLast ? "Submit" : "Next", "on-click-action": { name: isLast ? "complete" : "navigate", ...(isLast ? {} : { next: { type: "screen", name: screenIds[i + 1] } }), payload: Object.fromEntries(qs.filter(q => q.options.length > 0).map(q => [q.id, `\${form.${q.id}}`])) } },
      ];
      return { id: sid, title: compositeSet.join(" · ").substring(0, 60), layout: { type: "SingleColumnLayout", children: [{ type: "Form", name: `form_${sid.toLowerCase()}`, children: formChildren }] } };
    });

    const scoringMetadata = questions.filter(q => q.scores && Object.keys(q.scores).length > 0).map(q => ({ id: q.id, composite: q.composite, weight: q.weight, impact_dimensions: IMPACT_DIMS[q.composite] || [], scores: q.scores }));
    const waFlow = { version: "6.0", data_api_version: "3.0", routing_model: routingModel, screens, _rootstory_metadata: { exportedAt: new Date().toISOString(), language: lang, total_questions: questions.length, scoring_map: scoringMetadata, translations: lang !== "en" ? trans : undefined } };

    const blob = new Blob([JSON.stringify(waFlow, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `rootstory_whatsapp_flow_${lang}.json` });
    a.click();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        id: "default" as string,
        questions: JSON.parse(JSON.stringify(questions)),
        translations: JSON.parse(JSON.stringify(trans)),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("question_schema")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        console.error("Failed to save question schema:", error);
        alert("Save failed: " + error.message);
        return;
      }

      // Also keep localStorage as fallback for the interview component
      const overrides: Record<string, { label?: string; options?: string[] }> = {};
      questions.forEach(q => {
        const orig = INITIAL_QS.find(o => o.id === q.id);
        if (!orig) return;
        const entry: { label?: string; options?: string[] } = {};
        if (q.label !== orig.label) entry.label = q.label;
        if (JSON.stringify(q.options) !== JSON.stringify(orig.options)) entry.options = q.options;
        if (Object.keys(entry).length) overrides[q.id] = entry;
      });
      localStorage.setItem("rootstory_question_overrides", JSON.stringify(overrides));

      setFlash(true);
      setTimeout(() => setFlash(false), 1600);
    } finally {
      setSaving(false);
    }
  };

  const trCount = lang !== "en" ? Object.keys(trans[lang]||{}).filter(k => trans[lang][k]?.label).length : 0;

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:"Georgia, serif",background:"#F5F3F0"}}>

      {/* ── TOP BAR ── */}
      <div style={{background:"#0D2818",padding:"0 20px",height:52,display:"flex",alignItems:"center",gap:16,flexShrink:0}}>
        <div style={{fontFamily:"Trebuchet MS,sans-serif",fontSize:17}}>
          <span style={{fontWeight:"bold",color:"#fff"}}>root</span>
          <span style={{color:"#E8A020"}}>story</span>
          <span style={{color:"rgba(255,255,255,0.3)",fontSize:12,marginLeft:10,fontWeight:400}}>Question Editor</span>
        </div>
        <div style={{flex:1}}/>

        {/* Global Edit Toggle */}
        <button onClick={()=>{ setGlobalEdit(!globalEdit); if (globalEdit) setEditingIds(new Set()); }}
          style={{padding:"5px 14px",borderRadius:5,border: globalEdit ? "1.5px solid #E8A020" : "1px solid rgba(255,255,255,0.2)",
            background: globalEdit ? "rgba(232,160,32,0.15)" : "transparent",
            color: globalEdit ? "#E8A020" : "rgba(255,255,255,0.75)",cursor:"pointer",fontSize:12,fontFamily:"Georgia, serif",
            display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14}}>{globalEdit ? "✎" : "✎"}</span>
          {globalEdit ? "Exit Edit Mode" : "Edit Mode"}
        </button>

        <div style={{display:"flex",gap:2,background:"rgba(255,255,255,0.08)",padding:3,borderRadius:6}}>
          {([["list","Questions"],["matrix","Score Matrix"],["branching","Branching Logic"]] as const).map(([v,lbl])=>(
            <button key={v} onClick={()=>setViewMode(v)}
              style={{padding:"4px 12px",border:"none",borderRadius:4,cursor:"pointer",fontSize:12,fontFamily:"Georgia, serif",
                background:viewMode===v?"#fff":"transparent",color:viewMode===v?"#0D2818":"rgba(255,255,255,0.6)"}}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={handleExport} style={{padding:"5px 14px",borderRadius:5,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",color:"rgba(255,255,255,0.75)",cursor:"pointer",fontSize:12,fontFamily:"Georgia, serif"}}>
          ↓ WhatsApp Flow JSON
        </button>
        <button onClick={handleSave} disabled={saving} style={{padding:"5px 16px",borderRadius:5,border:"none",fontFamily:"Georgia, serif",cursor:saving?"wait":"pointer",fontSize:12,fontWeight:500,background:flash?"#2E7D52":saving?"#C8C4BC":"#E8A020",color:flash?"#fff":"#0D2818",transition:"background 0.2s"}}>
          {flash?"✓ Saved":saving?"Saving…":"Save to Database"}
        </button>
      </div>

      {/* ── TOOLBAR ── */}
      <div style={{background:"#fff",borderBottom:"0.5px solid #E0DDD8",padding:"9px 20px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ID or keyword…" style={{width:200,fontSize:13,padding:"4px 8px",border:"0.5px solid #C8C4BC",borderRadius:4,fontFamily:"Georgia, serif"}}/>
        {search && <button onClick={()=>setSearch("")} style={{fontSize:11,padding:"3px 8px",borderRadius:4,border:"0.5px solid #C8C4BC",cursor:"pointer"}}>✕</button>}
        <div style={{width:1,height:26,background:"#E0DDD8"}}/>
        <span style={{fontSize:10,fontWeight:500,color:"#8A8A9A",letterSpacing:0.6,textTransform:"uppercase"}}>Language</span>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {LANGS.map(l=>(
            <button key={l.code} onClick={()=>setLang(l.code)}
              style={{padding:"3px 10px",borderRadius:12,cursor:"pointer",fontSize:12,fontFamily:"Georgia, serif",
                border:lang===l.code?"1.5px solid #0D2818":"0.5px solid #E0DDD8",
                background:lang===l.code?"#0D2818":"transparent",
                color:lang===l.code?"#fff":"#3A3A5C"}}>
              {l.label}
            </button>
          ))}
        </div>
        {lang!=="en" && <span style={{fontSize:11,color:"#8A8A9A"}}>{trCount}/{questions.length} labels translated</span>}
        <div style={{flex:1}}/>
        {globalEdit && (
          <button onClick={()=>addQuestion()} style={{padding:"4px 14px",borderRadius:5,border:"1.5px solid #2E7D52",background:"#E8F5EE",color:"#0D2818",cursor:"pointer",fontSize:12,fontFamily:"Georgia, serif",fontWeight:500}}>
            + Add Question
          </button>
        )}
        <span style={{fontSize:11,color:"#8A8A9A"}}>{visible.length} of {questions.length}</span>
      </div>

      <div style={{display:"flex",flex:1,minHeight:0}}>

        {/* ── SIDEBAR ── */}
        <div style={{width:190,flexShrink:0,background:"#fff",borderRight:"0.5px solid #E0DDD8",overflowY:"auto",padding:"10px 0"}}>
          <div style={{fontSize:10,fontWeight:500,color:"#8A8A9A",letterSpacing:0.7,padding:"0 12px 8px",textTransform:"uppercase"}}>Composite</div>
          {["All",...Object.keys(COMPOSITES)].map(comp=>{
            const cnt   = comp==="All"?questions.length:questions.filter(q=>q.composite===comp).length;
            const isAct = filterComp===comp;
            const cc    = COMPOSITES[comp];
            return (
              <button key={comp} onClick={()=>setFilterComp(comp)}
                style={{width:"100%",textAlign:"left",border:"none",cursor:"pointer",padding:"6px 12px",
                  background:isAct?(cc?.bg||"#F5F3F0"):"transparent",
                  borderLeft:`3px solid ${isAct?(cc?.border||"#0D2818"):"transparent"}`,
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,fontWeight:isAct?500:400,color:isAct?(cc?.text||"#0D2818"):"#1A1A2E",lineHeight:1.3}}>{comp}</span>
                <span style={{fontSize:10,color:isAct?(cc?.text||"#0D2818"):"#8A8A9A",background:"rgba(0,0,0,0.07)",padding:"1px 5px",borderRadius:8}}>{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* ── MAIN ── */}
        <div style={{flex:1,overflowY:"auto",padding:"14px 20px",display:"flex",flexDirection:"column",gap:8}}>
          {viewMode==="matrix"
            ? <ScoreMatrix questions={questions}/>
            : viewMode==="branching"
            ? <BranchingLogic questions={questions} editMode={globalEdit} updateField={updateField}/>
            : visible.length===0
              ? <div style={{padding:"48px",textAlign:"center",color:"#8A8A9A",fontSize:14}}>No questions match.</div>
              : visible.map(q=>(
                  <QCard key={q.id} q={q} lang={lang} expanded={expandedId===q.id}
                    onToggle={()=>setExpandedId(expandedId===q.id?null:q.id)}
                    getTr={getTr} setTr={setTr}
                    updateScore={updateScore} updateLabel={updateLabel} updateOpt={updateOpt}
                    editMode={isEditing(q.id)} onToggleEdit={()=>toggleEditQ(q.id)}
                    globalEdit={globalEdit}
                    updateField={updateField}
                    addOption={addOption} removeOption={removeOption}
                    moveQuestion={moveQuestion} deleteQuestion={deleteQuestion}
                    addQuestion={addQuestion} duplicateQuestion={duplicateQuestion}
                    questions={questions}
                  />
                ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── QUESTION CARD ────────────────────────────────────────────────────────────
function QCard({q,lang,expanded,onToggle,getTr,setTr,updateScore,updateLabel,updateOpt,editMode,onToggleEdit,globalEdit,updateField,addOption,removeOption,moveQuestion,deleteQuestion,addQuestion,duplicateQuestion,questions}: {
  q: Question;
  lang: string;
  expanded: boolean;
  onToggle: () => void;
  getTr: (qid: string, type: string, opt?: string) => string;
  setTr: (qid: string, type: string, opt: string | null, val: string) => void;
  updateScore: (qid: string, key: string, val: number) => void;
  updateLabel: (qid: string, val: string) => void;
  updateOpt: (qid: string, old: string, nw: string) => void;
  editMode: boolean;
  onToggleEdit: () => void;
  globalEdit: boolean;
  updateField: (qid: string, field: keyof Question, val: any) => void;
  addOption: (qid: string) => void;
  removeOption: (qid: string, opt: string) => void;
  moveQuestion: (qid: string, dir: -1 | 1) => void;
  deleteQuestion: (qid: string) => void;
  addQuestion: (afterId?: string) => void;
  duplicateQuestion: (qid: string) => void;
  questions: Question[];
}) {
  const cc      = COMPOSITES[q.composite]||COMPOSITES["Setup / Admin"];
  const hasScore= !!(q.scores && Object.keys(q.scores).length>0 && q.type!=="open");
  const isScale = q.type==="scale5";
  const isEn    = lang==="en";
  const hasHint = !!q.hint;
  const qIdx    = questions.findIndex(x => x.id === q.id);

  return (
    <div style={{background:"#fff",border: editMode ? "1.5px solid #E8A020" : "0.5px solid #E0DDD8",borderRadius:8,overflow:"hidden",borderLeft:`3px solid ${cc.border}`,position:"relative"}}>

      {/* header */}
      <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 14px",cursor:"pointer",userSelect:"none"}}>

        {/* Reorder buttons */}
        {(editMode || globalEdit) && (
          <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0,paddingTop:1}}>
            <button onClick={(e)=>{e.stopPropagation();moveQuestion(q.id,-1);}} disabled={qIdx===0}
              style={{border:"none",background:"none",cursor:qIdx===0?"default":"pointer",fontSize:10,color:qIdx===0?"#E0DDD8":"#8A8A9A",padding:"1px 4px",lineHeight:1}}>▲</button>
            <button onClick={(e)=>{e.stopPropagation();moveQuestion(q.id,1);}} disabled={qIdx===questions.length-1}
              style={{border:"none",background:"none",cursor:qIdx===questions.length-1?"default":"pointer",fontSize:10,color:qIdx===questions.length-1?"#E0DDD8":"#8A8A9A",padding:"1px 4px",lineHeight:1}}>▼</button>
          </div>
        )}

        <div onClick={onToggle} style={{display:"flex",flex:1,alignItems:"flex-start",gap:10,minWidth:0}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center",flexShrink:0,paddingTop:2}}>
            <span style={{fontSize:11,fontWeight:500,padding:"2px 7px",borderRadius:4,background:cc.bg,color:cc.text,fontFamily:"monospace"}}>{q.id}</span>
            <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"#F5F3F0",color:"#8A8A9A"}}>{q.module}</span>
            {q.weight && <WeightDots w={q.weight}/>}
            {!q.always && <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:"#FEF3DC",color:"#8A4A00"}} title={q.conditionRule||"Conditional"}>⑂ {q.conditionRule ? q.conditionRule.slice(0,40)+(q.conditionRule.length>40?"…":"") : "conditional"}</span>}
            {q.adminComment && <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"#EEF0FF",color:"#3040C0"}} title={q.adminComment}>💬</span>}
            {q.researcherDirection && <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"#FFF0F8",color:"#A0206A"}} title={q.researcherDirection}>🔬</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,color:"#1A1A2E",lineHeight:1.5}}>{q.label}</div>
            {hasHint && !expanded && <div style={{fontSize:11,color:"#8A8A9A",marginTop:2,fontStyle:"italic"}}>{q.hint}</div>}
          </div>
          <span style={{color:"#8A8A9A",fontSize:12,flexShrink:0,paddingTop:3,transform:expanded?"rotate(180deg)":"none",transition:"transform 0.15s"}}>▾</span>
        </div>

        {/* Per-question edit toggle */}
        {!globalEdit && (
          <button onClick={(e)=>{e.stopPropagation();onToggleEdit();}}
            style={{border:"none",background: editMode ? "#FEF3DC" : "transparent",
              cursor:"pointer",fontSize:13,padding:"3px 6px",borderRadius:4,flexShrink:0,
              color: editMode ? "#C47A0A" : "#C8C4BC"}}
            title={editMode ? "Exit edit mode" : "Edit this question"}>
            ✎
          </button>
        )}
      </div>

      {expanded && (
        <div style={{borderTop:"0.5px solid #E0DDD8",background:"#F9F7F4"}}>

          {/* ── EDIT MODE: Metadata Fields ── */}
          {editMode && (
            <div style={{padding:"12px 14px",borderBottom:"0.5px solid #E0DDD8",background:"#FFFBE6"}}>
              <div style={{fontSize:10,fontWeight:600,color:"#A07800",textTransform:"uppercase",letterSpacing:0.7,marginBottom:10}}>✎ Edit Metadata</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:10}}>
                {/* ID */}
                <EditField label="Question ID">
                  <input value={q.id} onChange={e=>updateField(q.id,"id",e.target.value)}
                    style={inputSm}/>
                </EditField>
                {/* Composite */}
                <EditField label="Composite / Category">
                  <select value={q.composite} onChange={e=>updateField(q.id,"composite",e.target.value)} style={inputSm}>
                    {Object.keys(COMPOSITES).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </EditField>
                {/* Module */}
                <EditField label="Module">
                  <select value={q.module} onChange={e=>updateField(q.id,"module",e.target.value)} style={inputSm}>
                    {MODULES.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </EditField>
                {/* Type */}
                <EditField label="Question Type">
                  <select value={q.type} onChange={e=>updateField(q.id,"type",e.target.value)} style={inputSm}>
                    {Q_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </EditField>
                {/* Weight */}
                <EditField label="Weight (1–3 or null)">
                  <select value={q.weight ?? ""} onChange={e=>updateField(q.id,"weight",e.target.value===""?null:Number(e.target.value))} style={inputSm}>
                    <option value="">None</option>
                    <option value="1">1 — Supporting</option>
                    <option value="2">2 — Strong signal</option>
                    <option value="3">3 — Primary</option>
                  </select>
                </EditField>
                {/* Always */}
                <EditField label="Visibility">
                  <select value={q.always?"always":"conditional"} onChange={e=>updateField(q.id,"always",e.target.value==="always")} style={inputSm}>
                    <option value="always">Always shown</option>
                    <option value="conditional">Conditional</option>
                  </select>
                </EditField>
              </div>

              {/* Hint */}
              <div style={{marginTop:10}}>
                <EditField label="Hint / Admin note">
                  <input value={q.hint} onChange={e=>updateField(q.id,"hint",e.target.value)} placeholder="Internal hint…" style={{...inputSm,width:"100%"}}/>
                </EditField>
              </div>

              {/* Admin Comment */}
              <div style={{marginTop:10}}>
                <EditField label="Admin Comment (internal only)">
                  <textarea value={q.adminComment||""} onChange={e=>updateField(q.id,"adminComment",e.target.value)}
                    placeholder="Internal admin notes about this question…"
                    style={{...inputSm,width:"100%",minHeight:48,resize:"vertical"}}/>
                </EditField>
              </div>

              {/* Researcher Direction */}
              <div style={{marginTop:10}}>
                <EditField label="Researcher Direction (shown when 'researcher-only' toggled)">
                  <textarea value={q.researcherDirection||""} onChange={e=>updateField(q.id,"researcherDirection",e.target.value)}
                    placeholder="Directions for the field researcher…"
                    style={{...inputSm,width:"100%",minHeight:48,resize:"vertical"}}/>
                </EditField>
              </div>

              {/* Condition Rule */}
              {!q.always && (
                <div style={{marginTop:10}}>
                  <EditField label="Branching Condition (when is this question shown?)">
                    <textarea value={q.conditionRule||""} onChange={e=>updateField(q.id,"conditionRule",e.target.value)}
                      placeholder='e.g. ES-5 = "Yes"'
                      style={{...inputSm,width:"100%",minHeight:48,resize:"vertical"}}/>
                  </EditField>
                </div>
              )}

              {/* Actions */}
              <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                <button onClick={()=>duplicateQuestion(q.id)} style={actionBtnStyle}>⧉ Duplicate</button>
                <button onClick={()=>addQuestion(q.id)} style={actionBtnStyle}>+ Insert After</button>
                <button onClick={()=>{if(confirm(`Delete question ${q.id}?`)) deleteQuestion(q.id);}}
                  style={{...actionBtnStyle,borderColor:"#C85000",color:"#C85000"}}>✕ Delete</button>
              </div>
            </div>
          )}

          {/* question label edit / translation */}
          <div style={{padding:"12px 14px"}}>
            <div style={{fontSize:10,fontWeight:500,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:0.7,marginBottom:6}}>
              {isEn?"Question label":"Translation — "+LANGS.find(l=>l.code===lang)?.label}
            </div>
            {isEn
              ? <InlineEdit value={q.label} onSave={v=>updateLabel(q.id,v)} multiline/>
              : (
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{fontSize:12,color:"#8A8A9A",padding:"7px 10px",background:"#fff",border:"0.5px solid #E0DDD8",borderRadius:6,lineHeight:1.5}}>{q.label}</div>
                  <textarea value={getTr(q.id,"label")} onChange={e=>setTr(q.id,"label",null,e.target.value)}
                    placeholder={"Translate to "+LANGS.find(l=>l.code===lang)?.label+"…"}
                    style={{width:"100%",minHeight:56,fontSize:13,padding:"7px 10px",border:"0.5px solid #C8C4BC",borderRadius:6,fontFamily:"Georgia, serif",resize:"vertical",boxSizing:"border-box"}}/>
                </div>
              )
            }
            {hasHint && <div style={{marginTop:8,fontSize:11,color:"#8A8A9A",fontStyle:"italic"}}>{q.hint}</div>}
          </div>

          {/* scoring table */}
          {(hasScore || (editMode && q.options.length > 0)) && (
            <div style={{padding:"0 14px 14px"}}>
              <div style={{fontSize:10,fontWeight:500,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:0.7,marginBottom:6}}>Response options & scoring</div>
              <div style={{display:"grid",gridTemplateColumns:isEn ? (editMode?"auto 1fr 84px 120px":"1fr 84px 120px") : (editMode?"auto 1fr 1fr 84px 110px":"1fr 1fr 84px 110px"),gap:8,padding:"5px 10px",background:"#0D2818",borderRadius:"6px 6px 0 0"}}>
                {editMode && <span style={{fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:500,width:24}}></span>}
                {["Option","Translation","Score","Effect"].filter((_,i)=>i!==1||!isEn).map(h=>(
                  <span key={h} style={{fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:500}}>{h}</span>
                ))}
              </div>
              <div style={{border:"0.5px solid #E0DDD8",borderTop:"none",borderRadius:"0 0 6px 6px",overflow:"hidden"}}>
                {q.options.map((opt,oi)=>{
                  const sk    = isScale ? String(oi+1) : opt;
                  const score = q.scores?.[sk];
                  const sa    = scoreAppearance(score);
                  return (
                    <div key={`${opt}-${oi}`} style={{display:"grid",gridTemplateColumns:isEn ? (editMode?"auto 1fr 84px 120px":"1fr 84px 120px") : (editMode?"auto 1fr 1fr 84px 110px":"1fr 1fr 84px 110px"),gap:8,padding:"7px 10px",alignItems:"center",
                      background:oi%2===0?"#fff":"#F9F7F4",
                      borderTop:oi>0?"0.5px solid #E0DDD8":"none"}}>
                      {editMode && (
                        <button onClick={()=>removeOption(q.id,opt)} title="Remove option"
                          style={{border:"none",background:"none",cursor:"pointer",fontSize:12,color:"#C85000",padding:"0 2px",width:24,textAlign:"center"}}>✕</button>
                      )}
                      <div style={{fontSize:12,color:"#1A1A2E",lineHeight:1.4}}>
                        {isEn
                          ? <InlineEdit value={isScale?`${oi+1} — ${opt}`:opt} onSave={v=>updateOpt(q.id,opt,isScale?v.replace(/^\d+ — /,"")||v:v)}/>
                          : <span>{isScale?`${oi+1} — ${opt}`:opt}</span>
                        }
                      </div>
                      {!isEn && (
                        <input value={getTr(q.id,"opt",opt)} onChange={e=>setTr(q.id,"opt",opt,e.target.value)}
                          placeholder="…" style={{fontSize:12,padding:"3px 7px",border:"0.5px solid #C8C4BC",borderRadius:4,width:"100%",boxSizing:"border-box",fontFamily:"Georgia, serif"}}/>
                      )}
                      <select value={score??0} onChange={e=>updateScore(q.id,sk,parseFloat(e.target.value))}
                        style={{fontSize:12,padding:"3px 4px",borderRadius:4,border:"0.5px solid #C8C4BC",fontFamily:"monospace",textAlign:"center",
                          color:(score??0)>0?"#0D2818":(score??0)<0?"#8A1A10":"#8A8A9A",fontWeight:score!==0?500:400}}>
                        {SCORE_OPTS.map(v=>(
                          <option key={v} value={v}>{v>0?"+"+v:String(v)}</option>
                        ))}
                      </select>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:11,fontWeight:500,padding:"2px 7px",borderRadius:4,background:sa.bg,color:sa.fg,fontFamily:"monospace",whiteSpace:"nowrap"}}>
                          {sa.label}
                        </span>
                        <span style={{fontSize:10,color:"#8A8A9A"}}>
                          {(score??0)>=0.8?"Strong +":(score??0)>=0.4?"Positive":(score??0)>0?"Weak +":(score??0)===0?"No effect":"Negative"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {editMode && (
                <button onClick={()=>addOption(q.id)} style={{marginTop:6,padding:"4px 12px",border:"1px dashed #C8C4BC",background:"transparent",borderRadius:4,cursor:"pointer",fontSize:11,color:"#8A8A9A",fontFamily:"Georgia, serif"}}>
                  + Add Option
                </button>
              )}
              <div style={{display:"flex",flexWrap:"wrap",gap:12,paddingTop:7}}>
                {[["#0D2818","#E8F5EE","0.8–1.0 Strong +"],["#1B5E3A","#E8F8F0","0.4–0.79 Positive"],["#705400","#FFFBE6","0.1–0.39 Weak +"],["#3A4A3A","#F0F4F0","0 No effect"],["#8A1A10","#FDECEA","−0.2 Negative"]].map(([fg,bg,l])=>(
                  <span key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#8A8A9A"}}>
                    <span style={{width:8,height:8,borderRadius:2,background:bg,border:`1px solid ${fg}`,display:"inline-block"}}/>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {q.type==="open" && (
            <div style={{padding:"10px 14px",display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{fontSize:14,color:"#A07800",marginTop:1}}>✎</span>
              <div style={{fontSize:12,color:"#8A8A9A",lineHeight:1.6}}>
                Open text — researcher transcribes exact words. No option scoring. Adds +5 depth boost to mapped composites when answered (≥15 chars).
              </div>
            </div>
          )}

          {/* Admin comment & researcher direction display (non-edit view) */}
          {!editMode && (q.adminComment || q.researcherDirection) && (
            <div style={{padding:"8px 14px",borderTop:"0.5px solid #E0DDD8",display:"flex",flexWrap:"wrap",gap:16}}>
              {q.adminComment && (
                <MetaCell label="Admin Comment">
                  <span style={{fontSize:12,color:"#3040C0",fontStyle:"italic"}}>{q.adminComment}</span>
                </MetaCell>
              )}
              {q.researcherDirection && (
                <MetaCell label="Researcher Direction">
                  <span style={{fontSize:12,color:"#A0206A",fontStyle:"italic"}}>{q.researcherDirection}</span>
                </MetaCell>
              )}
            </div>
          )}

          <div style={{display:"flex",flexWrap:"wrap",gap:16,padding:"10px 14px",borderTop:"0.5px solid #E0DDD8"}}>
            <MetaCell label="Composite">
              <span style={{fontSize:12,fontWeight:500,padding:"2px 9px",borderRadius:4,background:cc.bg,color:cc.text}}>{q.composite}</span>
            </MetaCell>
            {IMPACT_DIMS[q.composite] && IMPACT_DIMS[q.composite].length > 0 && (
              <MetaCell label={IMPACT_DIMS[q.composite].length > 1 ? "Impact Dimensions" : "Impact Dimension"}>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {IMPACT_DIMS[q.composite].map(dim => (
                    <span key={dim} style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:"#F5F3F0",border:"0.5px solid #E0DDD8",color:"#3A3A5C"}}>{dim}</span>
                  ))}
                </div>
              </MetaCell>
            )}
            {q.weight && (
              <MetaCell label="Weight">
                <span style={{fontSize:12,color:"#8A8A9A"}}>{q.weight}/3 — {WEIGHT_LABEL[q.weight]}</span>
              </MetaCell>
            )}
            <MetaCell label="Shown">
              <span style={{fontSize:12,color:"#8A8A9A"}}>{q.always?"Always shown":"Conditional"}</span>
            </MetaCell>
            <MetaCell label="Type">
              <span style={{fontSize:12,color:"#8A8A9A",fontFamily:"monospace"}}>{q.type}</span>
            </MetaCell>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BRANCHING LOGIC ──────────────────────────────────────────────────────────
function BranchingLogic({questions, editMode, updateField}: {questions: Question[]; editMode: boolean; updateField: (qid: string, field: keyof Question, val: any) => void}) {
  const conditional = questions.filter(q => !q.always);
  const gateIds = new Set<string>();
  conditional.forEach(q => {
    if (!q.conditionRule) return;
    const matches = q.conditionRule.match(/[A-Z]{1,3}-?\d+[a-z]?/g);
    if (matches) matches.forEach(m => gateIds.add(m));
  });

  const branches: Record<string, {gate: Question | undefined; children: Question[]}> = {};
  conditional.forEach(q => {
    if (!q.conditionRule) {
      if (!branches["_unspecified"]) branches["_unspecified"] = {gate: undefined, children: []};
      branches["_unspecified"].children.push(q);
      return;
    }
    const matches = q.conditionRule.match(/[A-Z]{1,3}-?\d+[a-z]?/g);
    const primaryGate = matches?.[0] || "_unspecified";
    if (!branches[primaryGate]) branches[primaryGate] = {gate: questions.find(g => g.id === primaryGate), children: []};
    branches[primaryGate].children.push(q);
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{fontSize:13,color:"#8A8A9A",lineHeight:1.6,padding:"4px 0 8px"}}>
        Visual map of all conditional (branching) questions. Each gate question triggers one or more follow-ups based on the participant's answer.
      </div>

      {/* Stats bar */}
      <div style={{display:"flex",gap:16,flexWrap:"wrap",padding:"10px 14px",background:"#fff",border:"0.5px solid #E0DDD8",borderRadius:8}}>
        {([["Total Questions",questions.length,"#1A1A2E"],["Always Shown",questions.filter(q=>q.always).length,"#2E7D52"],["Conditional",conditional.length,"#C47A0A"],["Gate Questions",gateIds.size,"#3040C0"]] as const).map(([lbl,val,clr])=>(
          <div key={lbl} style={{display:"flex",flexDirection:"column",gap:2}}>
            <span style={{fontSize:10,fontWeight:500,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:0.5}}>{lbl}</span>
            <span style={{fontSize:18,fontWeight:600,color:clr as string}}>{val}</span>
          </div>
        ))}
      </div>

      {/* Branch groups */}
      {Object.entries(branches).map(([gateId, {gate, children}]) => {
        const cc = gate ? (COMPOSITES[gate.composite] || COMPOSITES["Setup / Admin"]) : {bg:"#F0F4F0",border:"#8A8A9A",text:"#3A4A3A"};
        return (
          <div key={gateId} style={{background:"#fff",border:"0.5px solid #E0DDD8",borderRadius:8,overflow:"hidden"}}>
            {/* Gate header */}
            <div style={{padding:"12px 16px",background:cc.bg,borderBottom:`1.5px solid ${cc.border}`,display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{width:4,minHeight:36,background:cc.border,borderRadius:2,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"#fff",color:cc.text,fontFamily:"monospace",border:`1px solid ${cc.border}`}}>
                    {gateId === "_unspecified" ? "⚠ No rule defined" : `⑂ ${gateId}`}
                  </span>
                  <span style={{fontSize:10,color:cc.text,fontWeight:500}}>GATE QUESTION</span>
                  {gate && <span style={{fontSize:10,color:"#8A8A9A"}}>→ triggers {children.length} follow-up{children.length!==1?"s":""}</span>}
                </div>
                {gate ? (
                  <div style={{fontSize:12,color:"#1A1A2E",lineHeight:1.5}}>{gate.label}</div>
                ) : gateId !== "_unspecified" ? (
                  <div style={{fontSize:12,color:"#8A8A9A",fontStyle:"italic"}}>Gate question "{gateId}" referenced but not found in question set</div>
                ) : null}
                {gate && gate.options.length > 0 && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
                    {gate.options.map(opt => {
                      const isReferenced = children.some(c => c.conditionRule?.includes(opt.slice(0,20)));
                      return (
                        <span key={opt} style={{fontSize:10,padding:"2px 7px",borderRadius:4,
                          background: isReferenced ? "#FEF3DC" : "#F5F3F0",
                          border: isReferenced ? "1px solid #C47A0A" : "0.5px solid #E0DDD8",
                          color: isReferenced ? "#8A4A00" : "#8A8A9A",
                          fontWeight: isReferenced ? 500 : 400}}>
                          {opt.length > 35 ? opt.slice(0,33)+"…" : opt}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Child branches */}
            <div>
              {children.map((q,ci) => {
                const qcc = COMPOSITES[q.composite] || COMPOSITES["Setup / Admin"];
                return (
                  <div key={q.id} style={{display:"flex",alignItems:"stretch",borderTop:ci>0?"0.5px solid #E0DDD8":"none"}}>
                    <div style={{width:48,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                      <div style={{position:"absolute",top:0,bottom:0,left:23,width:2,background:"#E0DDD8"}}/>
                      <div style={{width:14,height:14,borderRadius:"50%",background:qcc.bg,border:`1.5px solid ${qcc.border}`,position:"relative",zIndex:1}}/>
                      <div style={{position:"absolute",left:30,width:18,height:2,background:"#E0DDD8",top:"50%"}}/>
                    </div>
                    <div style={{flex:1,padding:"10px 14px 10px 0",minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,fontWeight:500,padding:"1px 7px",borderRadius:4,background:qcc.bg,color:qcc.text,fontFamily:"monospace"}}>{q.id}</span>
                        <span style={{fontSize:10,color:"#8A8A9A"}}>{q.composite}</span>
                        {q.weight && <WeightDots w={q.weight}/>}
                      </div>
                      <div style={{fontSize:12,color:"#1A1A2E",lineHeight:1.5,marginBottom:4}}>
                        {q.label.length > 90 ? q.label.slice(0,88)+"…" : q.label}
                      </div>
                      <div style={{display:"flex",alignItems:"flex-start",gap:6}}>
                        <span style={{fontSize:10,fontWeight:600,color:"#C47A0A",flexShrink:0,paddingTop:1}}>IF</span>
                        {editMode ? (
                          <input value={q.conditionRule||""} onChange={e=>updateField(q.id,"conditionRule",e.target.value)}
                            placeholder="Define condition rule…"
                            style={{fontSize:11,padding:"2px 8px",border:"1px solid #C47A0A",borderRadius:4,fontFamily:"Georgia, serif",
                              background:"#FFFBE6",color:"#8A4A00",width:"100%",boxSizing:"border-box"}}/>
                        ) : (
                          <span style={{fontSize:11,color:"#8A4A00",background:"#FEF3DC",padding:"1px 8px",borderRadius:4,lineHeight:1.5}}>
                            {q.conditionRule || "No condition rule defined"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{height:8,marginLeft:23,width:2,background:"#E0DDD8"}}/>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:16,padding:"12px 14px",background:"#fff",border:"0.5px solid #E0DDD8",borderRadius:8}}>
        <span style={{fontSize:10,fontWeight:600,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:0.5}}>Legend</span>
        {[["#3040C0","#EEF0FF","Gate question — triggers branches"],["#C47A0A","#FEF3DC","Conditional — shown based on answer"],["#2E7D52","#E8F5EE","Always shown — no conditions"]].map(([fg,bg,l])=>(
          <span key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#8A8A9A"}}>
            <span style={{width:10,height:10,borderRadius:3,background:bg as string,border:`1px solid ${fg}`,display:"inline-block"}}/>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── SCORE MATRIX ─────────────────────────────────────────────────────────────
function ScoreMatrix({questions}: {questions: Question[]}) {
  const scored = questions.filter(q=>q.scores&&Object.keys(q.scores).length>0&&q.type!=="open");
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{fontSize:13,color:"#8A8A9A",lineHeight:1.6,padding:"4px 0 8px"}}>
        All scored questions across composites. Click any cell to see the full question card.
      </div>
      {Object.keys(COMPOSITES).filter(c=>c!=="Setup / Admin"&&c!=="Narrative").map(comp=>{
        const qs = scored.filter(q=>q.composite===comp);
        if (!qs.length) return null;
        const cc = COMPOSITES[comp];
        return (
          <div key={comp}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:500,padding:"3px 10px",borderRadius:4,background:cc.bg,color:cc.text}}>{comp}</span>
              {IMPACT_DIMS[comp] && <span style={{fontSize:11,color:"#8A8A9A"}}>→ {IMPACT_DIMS[comp].join(" · ")}</span>}
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#0D2818"}}>
                    <th style={{padding:"5px 10px",textAlign:"left",color:"rgba(255,255,255,0.6)",fontWeight:500,fontSize:10,width:44,whiteSpace:"nowrap"}}>ID</th>
                    <th style={{padding:"5px 10px",textAlign:"left",color:"rgba(255,255,255,0.6)",fontWeight:500,fontSize:10}}>Question</th>
                    <th style={{padding:"5px 10px",textAlign:"left",color:"rgba(255,255,255,0.6)",fontWeight:500,fontSize:10}}>Options → score</th>
                    <th style={{padding:"5px 10px",textAlign:"center",color:"rgba(255,255,255,0.6)",fontWeight:500,fontSize:10,width:56}}>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {qs.map((q,qi)=>(
                    <tr key={q.id} style={{background:qi%2===0?"#fff":"#F9F7F4",borderBottom:"0.5px solid #E0DDD8"}}>
                      <td style={{padding:"7px 10px",verticalAlign:"top"}}>
                        <span style={{fontFamily:"monospace",fontSize:11,fontWeight:500,color:cc.text,background:cc.bg,padding:"1px 6px",borderRadius:3}}>{q.id}</span>
                      </td>
                      <td style={{padding:"7px 10px",verticalAlign:"top",fontSize:11,color:"#8A8A9A",maxWidth:220}}>
                        {q.label.length>70?q.label.slice(0,68)+"…":q.label}
                      </td>
                      <td style={{padding:"7px 10px",verticalAlign:"top"}}>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                          {q.options.map((opt,oi)=>{
                            const sk    = q.type==="scale5"?String(oi+1):opt;
                            const score = q.scores?.[sk];
                            const sa    = scoreAppearance(score);
                            const disp  = q.type==="scale5"?`${oi+1}`:opt.length>22?opt.slice(0,20)+"…":opt;
                            return (
                              <div key={opt} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 7px",border:"0.5px solid #E0DDD8",borderRadius:4,background:"#fff"}}>
                                <span style={{fontSize:10,color:"#1A1A2E"}}>{disp}</span>
                                <span style={{fontSize:10,fontWeight:500,padding:"1px 4px",borderRadius:3,background:sa.bg,color:sa.fg,fontFamily:"monospace"}}>{sa.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{padding:"7px 10px",textAlign:"center",verticalAlign:"top"}}><WeightDots w={q.weight}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const inputSm: React.CSSProperties = {
  fontSize:12, padding:"4px 8px", border:"0.5px solid #C8C4BC", borderRadius:4,
  fontFamily:"Georgia, serif", boxSizing:"border-box", width:"100%", background:"#fff",
};

const actionBtnStyle: React.CSSProperties = {
  padding:"4px 12px", borderRadius:4, border:"1px solid #C8C4BC", background:"#fff",
  cursor:"pointer", fontSize:11, fontFamily:"Georgia, serif", color:"#1A1A2E",
};

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function EditField({label,children}: {label: string; children: React.ReactNode}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <span style={{fontSize:10,fontWeight:500,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>
      {children}
    </div>
  );
}

function WeightDots({w}: {w: number | null}) {
  if (!w) return null;
  const filled = ["#8A9A8A","#2E7D52","#0D2818"];
  return (
    <div style={{display:"inline-flex",gap:3,alignItems:"center"}} title={`${w}/3 — ${WEIGHT_LABEL[w]}`}>
      {[1,2,3].map(i=>(
        <span key={i} style={{width:6,height:6,borderRadius:"50%",display:"inline-block",background:i<=w?filled[w-1]:"#E0DDD8"}}/>
      ))}
    </div>
  );
}

function MetaCell({label,children}: {label: string; children: React.ReactNode}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:2}}>
      <span style={{fontSize:10,fontWeight:500,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>
      {children}
    </div>
  );
}

function InlineEdit({value,onSave,multiline}: {value: string; onSave: (v: string) => void; multiline?: boolean}) {
  const [editing,setEditing] = useState(false);
  const [val,setVal]         = useState(value);
  const commit = () => { if (val.trim()) onSave(val.trim()); setEditing(false); };
  const cancel = () => { setVal(value); setEditing(false); };
  if (!editing) return (
    <span onClick={()=>{setVal(value);setEditing(true);}}
      style={{cursor:"text",borderBottom:"1px dashed #C8C4BC",color:"#1A1A2E",fontSize:"inherit",lineHeight:"inherit"}}
      title="Click to edit">
      {value}
    </span>
  );
  const base: React.CSSProperties = {width:"100%",fontSize:13,padding:"6px 8px",border:"1.5px solid #0D2818",borderRadius:4,fontFamily:"Georgia, serif",outline:"none",boxSizing:"border-box"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {multiline
        ? <textarea autoFocus value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")cancel();}} style={{...base,minHeight:64,resize:"vertical"}}/>
        : <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape")cancel();}} style={base}/>
      }
      <div style={{display:"flex",gap:6}}>
        <button onClick={commit} style={{padding:"3px 12px",background:"#0D2818",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:12,fontFamily:"Georgia, serif"}}>Save</button>
        <button onClick={cancel} style={{padding:"3px 10px",background:"transparent",color:"#8A8A9A",border:"0.5px solid #C8C4BC",borderRadius:4,cursor:"pointer",fontSize:12,fontFamily:"Georgia, serif"}}>Cancel</button>
      </div>
    </div>
  );
}
