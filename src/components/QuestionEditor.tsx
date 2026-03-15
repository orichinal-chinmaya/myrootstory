import { useState, useCallback } from "react";

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

// v0.4: composites can feed multiple domains
const DOMAIN_COMPOSITES: Record<string, string[]> = {
  "Economic Security":              ["Household Stability", "Debt & Credit Relief", "Savings & Assets"],
  "Consumption Quality & Multiplier": ["Nutrition & Health", "Education", "Livelihood & Enterprise", "Community & Social"],
  "Women's Empowerment":            ["Financial Confidence", "Household Agency", "Social Empowerment", "Financial Inclusion"],
  "Social Transformation":          ["Social Empowerment", "Household Agency", "Community & Social"],
};

const IMPACT_DIM: Record<string, string> = {
  "Household Stability":"Economic Security",
  "Debt & Credit Relief":"Economic Security",
  "Savings & Assets":"Economic Security",
  "Nutrition & Health":"Consumption Quality & Multiplier",
  "Education":"Consumption Quality & Multiplier",
  "Financial Confidence":"Women's Empowerment",
  "Household Agency":"Women's Empowerment",
  "Social Empowerment":"Women's Empowerment",
  "Financial Inclusion":"Women's Empowerment",
  "Livelihood & Enterprise":"Consumption Quality & Multiplier",
  "Community & Social":"Consumption Quality & Multiplier",
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
  composite: string;
  module: string;
  weight: number | null;
  always: boolean;
  type: string;
  label: string;
  options: string[];
  scores?: Record<string, number>;
  hint: string;
}

// ─── COMPLETE QUESTION DATA ───────────────────────────────────────────────────
const INITIAL_QS: Question[] = [
  // SETUP
  { id:"S2",  composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"select",   label:"District",                                                   options:[],  hint:"" },
  { id:"S4",  composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"text",     label:"Village / Area",                                             options:[],  hint:"" },
  { id:"S5",  composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"location", label:"Location (GPS)",                                             options:[],  hint:"Optional" },
  { id:"C1",  composite:"Setup / Admin",  module:"Consent",         weight:null, always:true,  type:"consent",  label:"Consent confirmed",                                          options:[],  hint:"Required — shown after GPS capture" },
  { id:"S8",  composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"select",   label:"DBT scheme she receives",                                    options:[],  hint:"" },
  { id:"S9",  composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"single",   label:"Household type",                                             options:["Lives alone","Nuclear family (herself, husband, children)","Joint family (with in-laws or extended family)","Female-headed household (no male earner)"],  hint:"" },
  { id:"S10", composite:"Setup / Admin",  module:"Setup",           weight:null, always:true,  type:"single",   label:"Primary livelihood",                                         options:["Agriculture (own land)","Agricultural labour","Daily wage labour","Small business / trade","MGNREGS work","No paid work","Other"],  hint:"" },
  { id:"SM1", composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Settlement type",                                            options:["Urban","Semi-urban","Rural","Tribal / forest area"],  hint:"Researcher observes — not asked to participant" },
  { id:"SM2", composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Monthly household income (approx)",                          options:["Below ₹5,000","₹5,000–10,000","₹10,000–20,000","Above ₹20,000","Prefer not to say"],  hint:"Researcher estimates from records" },
  { id:"SM3", composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Age group",                                                  options:["18–25","26–35","36–45","46–55","56 and above"],  hint:"" },
  { id:"SM4", composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Education level",                                            options:["No formal education","Primary (up to Class 5)","Secondary (Class 6–10)","Higher Secondary (Class 11–12)","Graduate or above"],  hint:"" },
  { id:"SM5", composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Social category",                                            options:["SC (Scheduled Caste)","ST (Scheduled Tribe)","OBC (Other Backward Class)","General / Open","Prefer not to say"],  hint:"From beneficiary records" },
  { id:"SM6", composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Marital status",                                             options:["Married","Widowed","Separated / divorced","Single / never married"],  hint:"" },
  { id:"SM7", composite:"Setup / Admin",  module:"Researcher only", weight:null, always:true,  type:"single",   label:"Children under 18 in household",                             options:["None","1","2","3 or more"],  hint:"" },

  // CONSUMPTION QUALITY — Fund Use & Importance
  { id:"P1", composite:"Household Stability",  module:"Core",        weight:1, always:true,  type:"multi",   label:"How did she mainly use the DBT money she received?",  options:["Food & household groceries","Children's school fees or books","Healthcare or medicines","Repaying a loan or debt","Savings","Starting or running a business or farm activity","Clothing or household items","Other"],  scores:{"Food & household groceries":0.5,"Children's school fees or books":0.5,"Healthcare or medicines":0.5,"Repaying a loan or debt":0.5,"Savings":1.0,"Starting or running a business or farm activity":0.5,"Clothing or household items":0.3,"Other":0.0},  hint:"Each item routes to its own composite" },
  { id:"P2", composite:"Household Stability",  module:"Core",        weight:1, always:true,  type:"open",    label:"In her own words — what is the single most important thing this money has done for her?",  options:[],  hint:"Depth boost +5 across composites when answered" },

  // NUTRITION & HEALTH
  { id:"N3", composite:"Nutrition & Health", module:"Core", weight:3, always:true, type:"single", label:"In the last 6 months, did her household spend more on healthcare or medicines than before DBT?",  options:["Yes, significantly more","Yes, a little more","About the same","Less"],  scores:{"Yes, significantly more":1.0,"Yes, a little more":0.65,"About the same":0.0,"Less":-0.2},  hint:"" },
  { id:"N4", composite:"Nutrition & Health", module:"Core", weight:3, always:true, type:"single", label:"Has the quality or quantity of food her household eats improved since she started receiving this money?",  options:["Yes, much better","Yes, a little better","About the same","Worse"],  scores:{"Yes, much better":1.0,"Yes, a little better":0.65,"About the same":0.0,"Worse":-0.2},  hint:"" },

  // EDUCATION
  { id:"N5", composite:"Education", module:"Core", weight:3, always:true, type:"single", label:"Has she been able to spend more on her children's education — fees, books, uniforms, or tuition?",  options:["Yes, significantly more","Yes, a little more","No change","Not applicable — no children in school"],  scores:{"Yes, significantly more":1.0,"Yes, a little more":0.65,"No change":0.0,"Not applicable — no children in school":0.4},  hint:"" },

  // PRODUCTIVE VS. SUBSISTENCE SPENDING
  { id:"CQ6", composite:"Savings & Assets", module:"Core", weight:2, always:true, type:"single", label:"If she were to estimate — what share of the DBT money did she spend on things that will help her household grow?",  options:["Most of it (more than half)","About half","Less than half","Almost none — it covers daily survival"],  scores:{"Most of it (more than half)":1.0,"About half":0.65,"Less than half":0.3,"Almost none — it covers daily survival":0.0},  hint:"" },

  // LIVELIHOOD & ENTERPRISE (conditional)
  { id:"CQ7", composite:"Livelihood & Enterprise", module:"Adaptive", weight:null, always:false, type:"multi", label:"What type of livelihood or farm activity did she use the money for?",  options:["Seeds or fertiliser","Livestock or poultry","Small shop or trade","Tools or equipment","Skills or training","Other"],  hint:"Shown if P1 includes business/farm. Context only." },
  { id:"A4b", composite:"Livelihood & Enterprise", module:"Adaptive", weight:3, always:false, type:"single", label:"Did this activity generate income or improve the household's productive capacity?",  options:["Yes, generating regular income","Yes, some additional income","Not yet but she expects it to","No income generated"],  scores:{"Yes, generating regular income":1.0,"Yes, some additional income":0.65,"Not yet but she expects it to":0.3,"No income generated":0.0},  hint:"Shown if P1 includes business/farm." },
  { id:"A4c", composite:"Livelihood & Enterprise", module:"Adaptive", weight:2, always:false, type:"single", label:"Did this activity create paid work for others in her household or community?",  options:["Yes, for household members","Yes, for community members","No"],  scores:{"Yes, for household members":0.8,"Yes, for community members":1.0,"No":0.0},  hint:"Also feeds Community & Social wt 1." },
  { id:"A4d", composite:"Livelihood & Enterprise", module:"Adaptive", weight:2, always:false, type:"single", label:"Does she plan to continue or expand this activity in the next 6 months?",  options:["Yes, expand","Yes, continue at same level","Uncertain","No"],  scores:{"Yes, expand":1.0,"Yes, continue at same level":0.65,"Uncertain":0.3,"No":0.0},  hint:"" },

  // COMMUNITY & SOCIAL
  { id:"CS1", composite:"Community & Social", module:"Community", weight:3, always:true, type:"single", label:"Since receiving this payment, has she been spending more at local shops, markets, or with local vendors?",  options:["Yes, spending more","About the same","Spending less locally"],  scores:{"Yes, spending more":1.0,"About the same":0.0,"Spending less locally":-0.2},  hint:"" },
  { id:"CS3", composite:"Community & Social", module:"Community", weight:2, always:true, type:"single", label:"Has she been able to provide financial support to other family members, relatives, or neighbours?",  options:["Yes, regularly","Yes, occasionally","No"],  scores:{"Yes, regularly":1.0,"Yes, occasionally":0.6,"No":0.0},  hint:"" },
  { id:"CS5", composite:"Community & Social", module:"Community", weight:2, always:true, type:"single", label:"Has she become more active in community activities, SHGs, or local women's groups since receiving this payment?",  options:["Yes, more active","About the same","Less active"],  scores:{"Yes, more active":1.0,"About the same":0.0,"Less active":-0.2},  hint:"" },
  { id:"ST2", composite:"Community & Social", module:"Community", weight:2, always:true, type:"single", label:"Since receiving Ladki Bahin, does she feel her position or standing in her community has changed?",  options:["Yes, she feels more respected","About the same","She feels less respected"],  scores:{"Yes, she feels more respected":1.0,"About the same":0.3,"She feels less respected":0.0},  hint:"" },
  { id:"ST3", composite:"Community & Social", module:"Community", weight:2, always:true, type:"single", label:"Since receiving Ladki Bahin, has she been able to provide support — financial or practical — to another woman, relative, or neighbour?",  options:["Yes, regularly","Yes, occasionally","No"],  scores:{"Yes, regularly":1.0,"Yes, occasionally":0.55,"No":0.0},  hint:"" },

  // HOUSEHOLD STABILITY
  { id:"P3", composite:"Household Stability",  module:"Core",        weight:1, always:true,  type:"scale5",  label:"Before receiving this money, how difficult was it to cover essential household expenses each month?",  options:["Very difficult","Difficult","Neither easy nor hard","Easy","Very easy"],  scores:{"1":1.0,"2":0.75,"3":0.5,"4":0.25,"5":0.0},  hint:"Baseline context." },
  { id:"P4", composite:"Household Stability",  module:"Core",        weight:3, always:true,  type:"scale5",  label:"Compared to before — has the pressure of covering household expenses felt any different since this money started coming?",  options:["Still just as hard","A little easier","Somewhat easier","Much easier","Completely different — real relief"],  scores:{"1":-0.2,"2":0.0,"3":0.4,"4":0.75,"5":1.0},  hint:"Primary stability measure." },
  { id:"P5", composite:"Household Stability",  module:"Core",        weight:3, always:true,  type:"single",  label:"Since receiving this payment, have her household expenses become more stable month to month?",  options:["Yes, much more stable","Yes, somewhat more stable","No change","No, less stable"],  scores:{"Yes, much more stable":1.0,"Yes, somewhat more stable":0.6,"No change":0.0,"No, less stable":-0.2},  hint:"" },
  { id:"P6", composite:"Household Stability",  module:"Core",        weight:null, always:true,  type:"single",  label:"In the last 6 months, did she experience an unexpected financial shock?",  options:["Yes","No"],  scores:{"Yes":0.0,"No":0.0},  hint:"Gate — triggers P7 if Yes, P7b if No." },
  { id:"P7", composite:"Household Stability",  module:"Core",        weight:2, always:false, type:"single",  label:"Was she able to manage it without borrowing at high interest?",  options:["Yes, managed without borrowing","Yes, but had to borrow","No, could not manage it"],  scores:{"Yes, managed without borrowing":1.0,"Yes, but had to borrow":0.4,"No, could not manage it":-0.2},  hint:"Path A: actual shock. Feeds Debt & Credit Relief wt 1." },
  { id:"P7b", composite:"Household Stability", module:"Core",        weight:2, always:false, type:"single",  label:"If she does experience a sudden financial shock in the future — do you think she'd be able to manage without borrowing?",  options:["Yes, she's confident she could","Maybe, depends on the size","Probably not","Don't know / uncertain"],  scores:{"Yes, she's confident she could":1.0,"Maybe, depends on the size":0.6,"Probably not":0.0,"Don't know / uncertain":0.3},  hint:"Path B: perceived capacity. Feeds Debt & Credit Relief wt 1." },
  { id:"P8", composite:"Household Stability",  module:"Core",        weight:2, always:true,  type:"single",  label:"Has the DBT payment given her more breathing room during month-end?",  options:["Yes, significantly more breathing room","Yes, a little more breathing room","No difference","Less breathing room than before"],  scores:{"Yes, significantly more breathing room":1.0,"Yes, a little more breathing room":0.6,"No difference":0.0,"Less breathing room than before":-0.2},  hint:"Subjective ease during crunch times." },
  { id:"D1", composite:"Household Stability",  module:"Story Depth", weight:1, always:false, type:"open",    label:"Tell me about a specific time before this money came when she could not manage an expense. What happened?",  options:[],  hint:"Depth boost +5 to Stability + Debt." },
  { id:"D2", composite:"Household Stability",  module:"Story Depth", weight:1, always:false, type:"open",    label:"Was there a specific month or moment when she felt things were different because of this payment?",  options:[],  hint:"Turning point. Depth boost +5." },

  // DEBT & CREDIT RELIEF
  { id:"P9",  composite:"Debt & Credit Relief", module:"Core",     weight:1, always:true,  type:"single", label:"Before receiving this money, how often did she borrow from a moneylender or informal lender?",  options:["Never","Rarely — once or twice a year","Sometimes — every few months","Often — every month or more"],  scores:{"Never":0.0,"Rarely — once or twice a year":0.3,"Sometimes — every few months":0.6,"Often — every month or more":1.0},  hint:"Baseline context." },
  { id:"P10", composite:"Debt & Credit Relief", module:"Core",     weight:3, always:false, type:"single", label:"Since receiving this money, how has that borrowing changed?",  options:["Stopped completely","Reduced significantly","Reduced a little","No change","Increased"],  scores:{"Stopped completely":1.0,"Reduced significantly":0.75,"Reduced a little":0.4,"No change":0.0,"Increased":-0.2},  hint:"Shown if P9 ≠ Never." },
  { id:"D3",  composite:"Debt & Credit Relief", module:"Story Depth", weight:1, always:false, type:"open", label:"Before this money came, where did that money come from? Who did she go to, and what did it cost her?",  options:[],  hint:"Shown if borrowing reduced. Depth boost +5." },
  { id:"P11", composite:"Debt & Credit Relief", module:"Core",     weight:2, always:false, type:"single", label:"Has this money helped her avoid taking a high-interest loan in the last year?",  options:["Yes, avoided at least one loan","Possibly","No","Not applicable"],  scores:{"Yes, avoided at least one loan":1.0,"Possibly":0.5,"No":0.0,"Not applicable":0.0},  hint:"Shown if P9 ≠ Never." },
  { id:"P12", composite:"Debt & Credit Relief", module:"Core",     weight:2, always:true,  type:"single", label:"How would she describe her overall financial management now compared to before?",  options:["Much better","Somewhat better","About the same","Worse"],  scores:{"Much better":1.0,"Somewhat better":0.65,"About the same":0.0,"Worse":-0.2},  hint:"" },
  { id:"A1a", composite:"Debt & Credit Relief", module:"Adaptive", weight:null, always:false, type:"multi", label:"What type of debt did she repay with this money?",  options:["Moneylender","Microfinance / SHG loan","Bank loan","Family or friend","Other"],  hint:"Context only. Shown if P1 includes debt + P10 shows reduction." },
  { id:"A1b", composite:"Debt & Credit Relief", module:"Adaptive", weight:2, always:false, type:"single", label:"Has she been able to reduce the total amount of debt her household carries?",  options:["Yes, significantly reduced","Yes, somewhat reduced","No change","Debt has increased"],  scores:{"Yes, significantly reduced":1.0,"Yes, somewhat reduced":0.65,"No change":0.0,"Debt has increased":-0.2},  hint:"" },
  { id:"A1c", composite:"Debt & Credit Relief", module:"Adaptive", weight:2, always:false, type:"single", label:"Does she feel less dependent on borrowing to get through the month now?",  options:["Yes, much less dependent","Yes, a little less","About the same","More dependent"],  scores:{"Yes, much less dependent":1.0,"Yes, a little less":0.6,"About the same":0.0,"More dependent":-0.2},  hint:"" },

  // SAVINGS & ASSETS
  { id:"N1", composite:"Savings & Assets",  module:"Core", weight:3, always:true, type:"single", label:"Has she started saving a portion of the DBT money regularly, even a small amount?",  options:["Yes, saving regularly","Yes, saving occasionally","Tried but couldn't","No"],  scores:{"Yes, saving regularly":1.0,"Yes, saving occasionally":0.65,"Tried but couldn't":0.3,"No":0.0},  hint:"" },
  { id:"N2", composite:"Savings & Assets",  module:"Core", weight:2, always:true, type:"single", label:"Has she purchased any asset since receiving this money — livestock, a tool, furniture, or anything of lasting value?",  options:["Yes, multiple assets","Yes, one asset","No"],  scores:{"Yes, multiple assets":1.0,"Yes, one asset":0.7,"No":0.0},  hint:"" },

  // FINANCIAL INCLUSION
  { id:"N8", composite:"Financial Inclusion", module:"Core", weight:3, always:true, type:"single", label:"How often does she use her bank account now compared to before receiving DBT?",  options:["I use it regularly now — didn't before","I use it more than before","About the same as before","I don't have or use a bank account"],  scores:{"I use it regularly now — didn't before":1.0,"I use it more than before":0.7,"About the same as before":0.0,"I don't have or use a bank account":0.0},  hint:"" },
  { id:"N9", composite:"Financial Inclusion", module:"Core", weight:3, always:true, type:"single", label:"Has she started doing anything specific to manage her money better — keeping a record, setting aside money, or using a savings group?",  options:["Yes, I keep a record or budget","Yes, I set aside money for specific purposes","Yes, I use an SHG or savings group","No specific practice"],  scores:{"Yes, I keep a record or budget":1.0,"Yes, I set aside money for specific purposes":0.8,"Yes, I use an SHG or savings group":0.7,"No specific practice":0.0},  hint:"" },
  { id:"ES22", composite:"Financial Inclusion", module:"Adaptive", weight:null, always:false, type:"multi", label:"What prevents her from using the bank account more often?",  options:["Fear or distrust of banks","Lacks understanding of how to use it","Insufficient balance to maintain account","Bank location or hours are inconvenient","Prefers to keep cash at home","Husband or family member controls the account","No specific barrier","Other"],  hint:"Diagnostic only. Shown if N8 < regular use." },

  // FINANCIAL CONFIDENCE
  { id:"P13", composite:"Financial Confidence", module:"Core",        weight:3, always:true,  type:"scale5", label:"On a scale of 1–5, how confident does she feel in managing her household's finances today?",  options:["1 — Not at all confident","2","3","4","5 — Very confident"],  scores:{"1":-0.2,"2":0.0,"3":0.5,"4":0.75,"5":1.0},  hint:"" },
  { id:"P14", composite:"Financial Confidence", module:"Core",        weight:3, always:true,  type:"single", label:"Has receiving this money changed how confident she feels about managing money?",  options:["Yes, much more confident","Yes, a little more confident","No change","Less confident"],  scores:{"Yes, much more confident":1.0,"Yes, a little more confident":0.65,"No change":0.0,"Less confident":-0.2},  hint:"" },
  { id:"D4",  composite:"Financial Confidence", module:"Story Depth", weight:1, always:false, type:"open",   label:"How does it feel to know that a payment is coming on a fixed date?",  options:[],  hint:"Depth boost +5 to Financial Confidence, Household Agency." },

  // HOUSEHOLD AGENCY
  { id:"E2",  composite:"Household Agency", module:"Core",     weight:3, always:true,  type:"single", label:"Does she personally decide how the money is spent?",  options:["Yes, I decide alone","Yes, jointly with my husband","My husband decides","Another family member decides"],  scores:{"Yes, I decide alone":1.0,"Yes, jointly with my husband":0.8,"My husband decides":0.0,"Another family member decides":0.0},  hint:"Gating: 0.0 for husband/family." },
  { id:"P15", composite:"Household Agency", module:"Core",     weight:3, always:true,  type:"single", label:"Does she feel she has more say in how the household money is spent since receiving this payment?",  options:["Yes, a lot more","Yes, a little more","No change","Less say than before"],  scores:{"Yes, a lot more":1.0,"Yes, a little more":0.6,"No change":0.0,"Less say than before":-0.2},  hint:"" },
  { id:"P16", composite:"Household Agency", module:"Core",     weight:2, always:true,  type:"single", label:"Is she now able to plan ahead financially — saving for school fees or a seasonal expense?",  options:["Yes, regularly","Yes, sometimes","Not yet but she wants to","No"],  scores:{"Yes, regularly":1.0,"Yes, sometimes":0.65,"Not yet but she wants to":0.3,"No":0.0},  hint:"" },
  { id:"E1",  composite:"Household Agency", module:"Adaptive", weight:null, always:false, type:"single", label:"Does the DBT payment come directly to her account?",  options:["Yes, directly to my account","Shared account with husband","Goes to husband's account","Goes to another family member"],  hint:"Shown if P15 positive. Context only." },
  { id:"A6c", composite:"Household Agency", module:"Adaptive", weight:2, always:false, type:"single", label:"Has her role in household financial decisions changed since receiving this money?",  options:["Yes, I have much more say","Yes, a little more say","No change","Less say"],  scores:{"Yes, I have much more say":1.0,"Yes, a little more say":0.6,"No change":0.0,"Less say":-0.2},  hint:"Shown if P15 positive." },
  { id:"WE8", composite:"Household Agency", module:"Core",     weight:1, always:true,  type:"single", label:"Does she feel more respected or listened to in the household since she started receiving this payment?",  options:["Yes, much more","Yes, a little","No change","Less respected"],  scores:{"Yes, much more":1.0,"Yes, a little":0.6,"No change":0.0,"Less respected":0.0},  hint:"" },
  { id:"A6b", composite:"Household Agency", module:"Adaptive", weight:2, always:false, type:"single", label:"Has that changed at all since she started receiving this money — does she have more of a say now?",  options:["Yes, I have much more say now","Yes, a little more say","No change","I have even less say now"],  scores:{"Yes, I have much more say now":1.0,"Yes, a little more say":0.6,"No change":0.0,"I have even less say now":-0.2},  hint:"Shown when E2 shows husband/family decides." },

  // SOCIAL EMPOWERMENT
  { id:"WE9", composite:"Social Empowerment", module:"Core",     weight:3, always:true,  type:"single", label:"Since receiving this payment, does she feel freer to move around — to attend meetings, visit family, go to the market?",  options:["Yes, much freer","Yes, somewhat freer","No change","Less free than before"],  scores:{"Yes, much freer":1.0,"Yes, somewhat freer":0.65,"No change":0.0,"Less free than before":-0.2},  hint:"" },
  { id:"N7",  composite:"Social Empowerment", module:"Core",     weight:3, always:true,  type:"single", label:"How has her sense of her own worth or standing changed since she started receiving this money?",  options:["I feel much more valued","I feel somewhat more valued","No change","I feel less valued"],  scores:{"I feel much more valued":1.0,"I feel somewhat more valued":0.65,"No change":0.0,"I feel less valued":-0.2},  hint:"" },
  { id:"WE11",composite:"Social Empowerment", module:"Core",     weight:2, always:true,  type:"single", label:"Has the attitude of her husband or other family members toward her changed since she started receiving this money?",  options:["Yes, they respect me more","Yes, they consult me more on decisions","No change","The relationship has become more difficult"],  scores:{"Yes, they respect me more":1.0,"Yes, they consult me more on decisions":0.8,"No change":0.0,"The relationship has become more difficult":-0.2},  hint:"" },
  { id:"N12", composite:"Social Empowerment", module:"Core",     weight:2, always:true,  type:"single", label:"Does she feel more financially independent — less dependent on her husband or family?",  options:["Yes, much more independent","Yes, somewhat more independent","No change","More dependent than before"],  scores:{"Yes, much more independent":1.0,"Yes, somewhat more independent":0.65,"No change":0.0,"More dependent than before":-0.2},  hint:"" },

  // NARRATIVE / SOCIAL TRANSFORMATION
  { id:"D6", composite:"Narrative", module:"Her Voice",  weight:null, always:true,  type:"open",   label:"How has her reliance on others changed since Ladki Bahin? Does she feel more independent?",  options:[],  hint:"Record exact language." },
  { id:"D7", composite:"Narrative", module:"Her Voice",  weight:null, always:true,  type:"open",   label:"If this payment stopped tomorrow — what is the first thing in her life that would be affected?",  options:[],  hint:"Reveals what matters most." },
  { id:"V2", composite:"Narrative", module:"Validation", weight:null, always:true,  type:"single", label:"Does this story accurately describe her experience?",  options:["Yes, this is my story","Mostly — small details to adjust","This needs to be rewritten"],  hint:"Read narrative aloud to her in her language." },
  { id:"V3", composite:"Narrative", module:"Validation", weight:null, always:false, type:"open",   label:"What would she like to correct or add?",  options:[],  hint:"Shown if V2 = needs adjustment. Record verbatim." },
  { id:"V4", composite:"Narrative", module:"Validation", weight:null, always:true,  type:"open",   label:"Is there anything else she would like to add — anything the story missed?",  options:[],  hint:"Final opportunity for her voice." },
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
  const [viewMode,   setViewMode]   = useState<"list"|"matrix">("list");
  const [flash,      setFlash]      = useState(false);

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

  const handleExport = () => {
    // ─── Build WhatsApp Flow JSON ───────────────────────────────────────────────
    // Group questions into screens of max ~8 components (leave room for Footer)
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
          children.push({
            type: "CheckboxGroup",
            label: displayLabel,
            name: q.id,
            required: q.always,
            "data-source": buildDataSource(q),
            ...(q.hint ? { description: q.hint } : {}),
          });
        } else if (q.type === "single" || q.type === "scale5") {
          children.push({
            type: "RadioButtonsGroup",
            label: displayLabel,
            name: q.id,
            required: q.always,
            "data-source": buildDataSource(q),
            ...(q.hint ? { description: q.hint } : {}),
          });
        } else if (q.type === "text") {
          children.push({
            type: "TextInput",
            label: displayLabel,
            name: q.id,
            required: q.always,
            "input-type": "text",
          });
        } else if (q.type === "select") {
          children.push({
            type: "Dropdown",
            label: displayLabel,
            name: q.id,
            required: q.always,
            "data-source": buildDataSource(q),
          });
        }
      });
      return children;
    };

    const screenIds = chunks.map((_, i) => `SCREEN_${String(i + 1).padStart(2, "0")}`);
    const routingModel: Record<string, string[]> = {};
    screenIds.forEach((sid, i) => {
      routingModel[sid] = i < screenIds.length - 1 ? [screenIds[i + 1]] : [];
    });

    const screens = chunks.map((qs, i) => {
      const sid   = screenIds[i];
      const isLast = i === chunks.length - 1;
      const compositeSet = [...new Set(qs.map(q => q.composite))];
      const children = buildChildren(qs);

      // Wrap in Form for all screens
      const formChildren: object[] = [
        ...children,
        {
          type: "Footer",
          label: isLast ? "Submit" : "Next",
          "on-click-action": {
            name: isLast ? "complete" : "navigate",
            ...(isLast ? {} : { next: { type: "screen", name: screenIds[i + 1] } }),
            payload: Object.fromEntries(
              qs.filter(q => q.options.length > 0).map(q => [q.id, `\${form.${q.id}}`])
            ),
          },
        },
      ];

      return {
        id: sid,
        title: compositeSet.join(" · ").substring(0, 60),
        layout: {
          type: "SingleColumnLayout",
          children: [
            {
              type: "Form",
              name: `form_${sid.toLowerCase()}`,
              children: formChildren,
            },
          ],
        },
      };
    });

    // Build scoring metadata as a separate data block for reference
    const scoringMetadata = questions
      .filter(q => q.scores && Object.keys(q.scores).length > 0)
      .map(q => ({
        id: q.id,
        composite: q.composite,
        weight: q.weight,
        impact_dimension: IMPACT_DIM[q.composite] || null,
        scores: q.scores,
      }));

    const waFlow = {
      version: "6.0",
      data_api_version: "3.0",
      routing_model: routingModel,
      screens,
      // ── Rootstory-specific metadata (not rendered by WhatsApp) ──────────────
      _rootstory_metadata: {
        exportedAt: new Date().toISOString(),
        language: lang,
        total_questions: questions.length,
        scoring_map: scoringMetadata,
        translations: lang !== "en" ? trans : undefined,
      },
    };

    const blob = new Blob([JSON.stringify(waFlow, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `rootstory_whatsapp_flow_${lang}.json`,
    });
    a.click();
  };

  // Persist edits to localStorage so RootstoryInterview can pick them up
  const handleSave = () => {
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
        <div style={{display:"flex",gap:2,background:"rgba(255,255,255,0.08)",padding:3,borderRadius:6}}>
          {(["list","matrix"] as const).map((v)=>(
            <button key={v} onClick={()=>setViewMode(v)}
              style={{padding:"4px 12px",border:"none",borderRadius:4,cursor:"pointer",fontSize:12,fontFamily:"Georgia, serif",
                background:viewMode===v?"#fff":"transparent",color:viewMode===v?"#0D2818":"rgba(255,255,255,0.6)"}}>
              {v === "list" ? "Questions" : "Score Matrix"}
            </button>
          ))}
        </div>
        <button onClick={handleExport} style={{padding:"5px 14px",borderRadius:5,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",color:"rgba(255,255,255,0.75)",cursor:"pointer",fontSize:12,fontFamily:"Georgia, serif"}}>
          ↓ WhatsApp Flow JSON
        </button>
        <button onClick={handleSave} style={{padding:"5px 16px",borderRadius:5,border:"none",fontFamily:"Georgia, serif",cursor:"pointer",fontSize:12,fontWeight:500,background:flash?"#2E7D52":"#E8A020",color:flash?"#fff":"#0D2818",transition:"background 0.2s"}}>
          {flash?"✓ Saved":"Save"}
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
            : visible.length===0
              ? <div style={{padding:"48px",textAlign:"center",color:"#8A8A9A",fontSize:14}}>No questions match.</div>
              : visible.map(q=>(
                  <QCard key={q.id} q={q} lang={lang} expanded={expandedId===q.id}
                    onToggle={()=>setExpandedId(expandedId===q.id?null:q.id)}
                    getTr={getTr} setTr={setTr}
                    updateScore={updateScore} updateLabel={updateLabel} updateOpt={updateOpt}/>
                ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── QUESTION CARD ────────────────────────────────────────────────────────────
function QCard({q,lang,expanded,onToggle,getTr,setTr,updateScore,updateLabel,updateOpt}: {
  q: Question;
  lang: string;
  expanded: boolean;
  onToggle: () => void;
  getTr: (qid: string, type: string, opt?: string) => string;
  setTr: (qid: string, type: string, opt: string | null, val: string) => void;
  updateScore: (qid: string, key: string, val: number) => void;
  updateLabel: (qid: string, val: string) => void;
  updateOpt: (qid: string, old: string, nw: string) => void;
}) {
  const cc      = COMPOSITES[q.composite]||COMPOSITES["Setup / Admin"];
  const hasScore= !!(q.scores && Object.keys(q.scores).length>0 && q.type!=="open");
  const isScale = q.type==="scale5";
  const isEn    = lang==="en";
  const hasHint = !!q.hint;

  return (
    <div style={{background:"#fff",border:"0.5px solid #E0DDD8",borderRadius:8,overflow:"hidden",borderLeft:`3px solid ${cc.border}`}}>

      {/* header */}
      <div onClick={onToggle} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 14px",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center",flexShrink:0,paddingTop:2}}>
          <span style={{fontSize:11,fontWeight:500,padding:"2px 7px",borderRadius:4,background:cc.bg,color:cc.text,fontFamily:"monospace"}}>{q.id}</span>
          <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"#F5F3F0",color:"#8A8A9A"}}>{q.module}</span>
          {q.weight && <WeightDots w={q.weight}/>}
          {!q.always && <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:"#FEF3DC",color:"#8A4A00"}}>conditional</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,color:"#1A1A2E",lineHeight:1.5}}>{q.label}</div>
          {hasHint && !expanded && <div style={{fontSize:11,color:"#8A8A9A",marginTop:2,fontStyle:"italic"}}>{q.hint}</div>}
        </div>
        <span style={{color:"#8A8A9A",fontSize:12,flexShrink:0,paddingTop:3,transform:expanded?"rotate(180deg)":"none",transition:"transform 0.15s"}}>▾</span>
      </div>

      {expanded && (
        <div style={{borderTop:"0.5px solid #E0DDD8",background:"#F9F7F4"}}>

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
          {hasScore && (
            <div style={{padding:"0 14px 14px"}}>
              <div style={{fontSize:10,fontWeight:500,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:0.7,marginBottom:6}}>Response options & scoring</div>
              <div style={{display:"grid",gridTemplateColumns:isEn?"1fr 84px 120px":"1fr 1fr 84px 110px",gap:8,padding:"5px 10px",background:"#0D2818",borderRadius:"6px 6px 0 0"}}>
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
                    <div key={opt} style={{display:"grid",gridTemplateColumns:isEn?"1fr 84px 120px":"1fr 1fr 84px 110px",gap:8,padding:"7px 10px",alignItems:"center",
                      background:oi%2===0?"#fff":"#F9F7F4",
                      borderTop:oi>0?"0.5px solid #E0DDD8":"none"}}>
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

          <div style={{display:"flex",flexWrap:"wrap",gap:16,padding:"10px 14px",borderTop:"0.5px solid #E0DDD8"}}>
            <MetaCell label="Composite">
              <span style={{fontSize:12,fontWeight:500,padding:"2px 9px",borderRadius:4,background:cc.bg,color:cc.text}}>{q.composite}</span>
            </MetaCell>
            {IMPACT_DIM[q.composite] && (
              <MetaCell label="Impact Dimension">
                <span style={{fontSize:12,color:"#8A8A9A"}}>{IMPACT_DIM[q.composite]}</span>
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
              {IMPACT_DIM[comp] && <span style={{fontSize:11,color:"#8A8A9A"}}>→ {IMPACT_DIM[comp]}</span>}
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

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
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
