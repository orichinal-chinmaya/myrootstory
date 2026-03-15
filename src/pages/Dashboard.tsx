import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import MaharashtraMap from "@/components/MaharashtraMap";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Story {
  id: string;
  timestamp: string;
  researcher_id: string;
  district: string;
  village: string;
  scheme: string;
  narrative: string;
  validated: boolean;
  answers: Record<string, unknown>;
  scores: Record<string, number>;
  impact_scores: Record<string, number>;
  settlement_type: string;
  income_range: string;
  age_group: string;
  education_level: string;
  social_category: string;
  marital_status: string;
  household_type: string;
  livelihood: string;
  themes: string[];
  created_at: string;
}

interface ThemeAnalysis {
  title: string;
  summary: string;
  themes: { name: string; count: number; evidence: string[]; policyImplication: string }[];
  keyInsight: string;
  recommendation: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const C = {
  teal: "#0D2818", tealMid: "#2E7D52", tealLight: "#E8F5EE",
  amber: "#E8A020", amberLight: "#FEF3DC",
  paper: "#F9F7F4", paperDark: "#EDE9E3",
  white: "#FFFFFF", grey: "#8A8A9A", border: "#C8D8C8",
  ink: "#0D2818", inkLight: "#2A4A2A",
  red: "#B03020", redLight: "#FDECEA",
  green: "#0D6E34",
};

const COMPOSITES: Record<string, { bg: string; b: string; t: string }> = {
  "Household Stability":     { bg:"#E8F5EE", b:"#0D2818", t:"#071A0E" },
  "Debt & Credit Relief":    { bg:"#FEF3DC", b:"#C47A0A", t:"#8A4A00" },
  "Savings & Assets":        { bg:"#E8F5EE", b:"#2E7D52", t:"#1B5E3A" },
  "Nutrition & Health":      { bg:"#FFF0E8", b:"#C85000", t:"#8A2800" },
  "Education":               { bg:"#EEF0FF", b:"#3040C0", t:"#1A2880" },
  "Financial Confidence":    { bg:"#F0EBF8", b:"#5B3A8C", t:"#3A1A6A" },
  "Household Agency":        { bg:"#EBF4FF", b:"#1A5FA8", t:"#0D3D70" },
  "Social Empowerment":      { bg:"#FFF0F8", b:"#A0206A", t:"#700040" },
  "Financial Inclusion":     { bg:"#FFFBE6", b:"#A07800", t:"#705400" },
  "Livelihood & Enterprise": { bg:"#E8F8F0", b:"#107048", t:"#083828" },
  "Community & Social":      { bg:"#FFF3E0", b:"#E65100", t:"#BF360C" },
};

const IMPACT_DIMS: Record<string, string> = {
  "Household Stability":     "Economic Security",
  "Debt & Credit Relief":    "Economic Security",
  "Savings & Assets":        "Economic Security",
  "Nutrition & Health":      "Consumption Quality",
  "Education":               "Consumption Quality",
  "Financial Confidence":    "Women's Empowerment",
  "Household Agency":        "Women's Empowerment",
  "Social Empowerment":      "Women's Empowerment",
  "Financial Inclusion":     "Women's Empowerment",
  "Livelihood & Enterprise": "Consumption Quality",
  "Community & Social":      "Social Transformation",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function scoreColor(v: number): string {
  if (v >= 70) return "#0D6E34";
  if (v >= 50) return "#2E7D52";
  if (v >= 30) return "#E8A020";
  if (v >= 0)  return "#C85000";
  return "#B03020";
}

// No local seed — data lives in the database

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard({ embedded = false }: { embedded?: boolean }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("All");
  const [filterValidated, setFilterValidated] = useState("All");
  const [filterComposite, setFilterComposite] = useState("All");
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ThemeAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview"|"stories"|"themes"|"policy"|"map">("overview");
  const [isDemo, setIsDemo] = useState(false);

  // Load stories
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("timestamp", { ascending: false });
      if (error) {
        console.error(error);
        setIsDemo(true);
      } else if (!data || data.length === 0) {
        setIsDemo(true);
      } else {
        setStories(data as Story[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Derived aggregates
  const districts = ["All", ...Array.from(new Set(stories.map(s => s.district).filter(Boolean)))];

  const filtered = stories.filter(s => {
    const matchSearch = !search || 
      (s.narrative || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.district || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.village || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.themes || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchDistrict = filterDistrict === "All" || s.district === filterDistrict;
    const matchValidated = filterValidated === "All" || (filterValidated === "Validated" ? s.validated : !s.validated);
    const matchComposite = filterComposite === "All" || 
      (s.scores && (s.scores[filterComposite] || 0) >= 50);
    return matchSearch && matchDistrict && matchValidated && matchComposite;
  });

  // Aggregate composite scores
  const compositeAvgs = Object.keys(COMPOSITES).map(c => ({
    name: c,
    score: avg(stories.map(s => s.scores?.[c] ?? 0).filter(v => v > 0)),
    color: COMPOSITES[c].b,
  })).sort((a, b) => b.score - a.score);

  // Impact dimension aggregates
  const impactDimData = Object.entries(
    stories.reduce((acc, s) => {
      Object.entries(IMPACT_DIMS).forEach(([comp, dim]) => {
        if (!acc[dim]) acc[dim] = [];
        if (s.scores?.[comp]) acc[dim].push(s.scores[comp]);
      });
      return acc;
    }, {} as Record<string, number[]>)
  ).map(([dim, vals]) => ({ dim, score: avg(vals) }));

  const totalStories = stories.length;
  const validatedCount = stories.filter(s => s.validated).length;
  const totalDistricts = new Set(stories.map(s => s.district).filter(Boolean)).size;
  const overallAvg = avg(compositeAvgs.map(c => c.score).filter(v => v > 0));

  // All themes
  const allThemes = Array.from(
    stories.reduce((acc, s) => {
      (s.themes || []).forEach(t => acc.set(t, (acc.get(t) || 0) + 1));
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);

  const toggleSelect = (id: string) => {
    setSelectedStories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedStories(new Set(filtered.map(s => s.id)));
  const clearSelect = () => setSelectedStories(new Set());

  const runAnalysis = useCallback(async (mode: "standard" | "custom") => {
    const storiesToAnalyze = selectedStories.size > 0
      ? stories.filter(s => selectedStories.has(s.id) && s.narrative)
      : filtered.filter(s => s.narrative).slice(0, 20);

    if (storiesToAnalyze.length < 2) {
      toast.error("Select at least 2 stories with narratives to analyse.");
      return;
    }

    setAnalysisLoading(true);
    setAnalysis(null);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-themes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({
            narratives: storiesToAnalyze.map(s => s.narrative),
            mode,
            customPrompt: mode === "custom" ? customPrompt : undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAnalysis(data.analysis);
      setActiveTab("themes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedStories, stories, filtered, customPrompt]);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:C.paper, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
          <div style={{ width:36, height:36, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.teal}`, borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
          <span style={{ color:C.grey, fontSize:14 }}>Loading stories…</span>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const TABS = [
    { id:"overview", label:"Overview" },
    { id:"map",      label:"◉ Map" },
    { id:"stories",  label:`Stories (${filtered.length})` },
    { id:"themes",   label:"AI Theme Discovery" },
    { id:"policy",   label:"Policy Signals" },
  ] as const;

  return (
    <div style={{ minHeight:"100vh", background:C.paper, fontFamily:"Georgia,serif", display:"flex", flexDirection:"column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── TOP BAR ── */}
      {!embedded && (
        <div style={{ background:C.teal, padding:"0 24px", height:56, display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
          <div style={{ fontFamily:"Trebuchet MS,sans-serif", fontSize:18 }}>
            <span style={{ fontWeight:"bold", color:"#fff" }}>root</span>
            <span style={{ color:C.amber }}>story</span>
            <span style={{ color:"rgba(255,255,255,0.35)", fontSize:12, marginLeft:10 }}>Policy Intelligence</span>
          </div>
          <div style={{ flex:1 }} />
          {isDemo && (
            <span style={{ fontSize:11, padding:"3px 10px", borderRadius:10, background:"rgba(232,160,32,0.2)", color:C.amber, border:`1px solid ${C.amber}` }}>
              Demo data — conduct interviews to populate
            </span>
          )}
          <Link to="/demo" style={{ fontSize:12, padding:"5px 14px", borderRadius:5, border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.75)", textDecoration:"none" }}>
            + New Interview
          </Link>
          <Link to="/" style={{ fontSize:12, color:"rgba(255,255,255,0.5)", textDecoration:"none" }}>← Home</Link>
        </div>
      )}

      {/* ── STAT STRIP ── */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"12px 24px", display:"flex", gap:32, alignItems:"center", flexWrap:"wrap" }}>
        {[
          { label:"Total Stories", value:totalStories },
          { label:"Validated", value:`${validatedCount} / ${totalStories}` },
          { label:"Districts", value:totalDistricts },
          { label:"Overall Impact", value:`${overallAvg}`, suffix:"/100" },
        ].map(({ label, value, suffix }) => (
          <div key={label}>
            <div style={{ fontSize:22, fontWeight:"bold", color:C.teal, fontFamily:"Georgia,serif" }}>
              {value}{suffix && <span style={{ fontSize:13, color:C.grey, fontWeight:"normal" }}>{suffix}</span>}
            </div>
            <div style={{ fontSize:11, color:C.grey, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={{ background:C.white, borderBottom:`2px solid ${C.paperDark}`, padding:"0 24px", display:"flex", gap:0 }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:"10px 20px", border:"none", background:"transparent", cursor:"pointer", fontSize:13,
              fontFamily:"Georgia,serif", color:activeTab===id?C.teal:C.grey,
              borderBottom:activeTab===id?`2px solid ${C.teal}`:"2px solid transparent",
              marginBottom:"-2px", fontWeight:activeTab===id?"bold":"normal" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex:1, padding:"20px 24px", maxWidth:1200, width:"100%", margin:"0 auto", boxSizing:"border-box" as const }}>

        {/* ═══════════════════ OVERVIEW ═══════════════════ */}
        {activeTab === "overview" && (
          <div style={{ display:"flex", flexDirection:"column" as const, gap:24, animation:"fadeIn 0.3s ease" }}>

            {/* Composite score grid */}
            <div>
              <h2 style={{ fontSize:15, fontWeight:"bold", color:C.teal, margin:"0 0 12px", letterSpacing:0.3 }}>
                Composite Impact Scores
                <span style={{ fontSize:11, fontWeight:"normal", color:C.grey, marginLeft:10 }}>Average across {totalStories} stories</span>
              </h2>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10 }}>
                {compositeAvgs.map(({ name, score }) => {
                  const col = COMPOSITES[name];
                  return (
                    <div key={name} style={{ background:col.bg, border:`1.5px solid ${col.b}`, borderRadius:10, padding:"14px 16px", display:"flex", flexDirection:"column" as const, gap:6 }}>
                      <div style={{ fontSize:30, fontWeight:"bold", color:col.t, fontFamily:"Georgia,serif", lineHeight:1 }}>{score || "—"}</div>
                      <div style={{ fontSize:10, fontWeight:"bold", color:col.t, lineHeight:1.3 }}>{name}</div>
                      <div style={{ height:4, background:"rgba(0,0,0,0.1)", borderRadius:2 }}>
                        <div style={{ height:"100%", background:col.b, width:`${score}%`, borderRadius:2, transition:"width 0.6s" }} />
                      </div>
                      <div style={{ fontSize:9, color:col.t, opacity:0.6 }}>{IMPACT_DIMS[name]}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Charts row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              {/* Bar chart */}
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 16px" }}>
                <div style={{ fontSize:13, fontWeight:"bold", color:C.ink, marginBottom:12 }}>Scores by Composite</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={compositeAvgs} layout="vertical" margin={{ left:0, right:20 }}>
                    <XAxis type="number" domain={[0,100]} tick={{ fontSize:10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize:9 }} width={140} />
                    <Tooltip formatter={(v: number) => [`${v}`, "Score"]} />
                    <Bar dataKey="score" radius={[0,3,3,0]}>
                      {compositeAvgs.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar — impact dims */}
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 16px" }}>
                <div style={{ fontSize:13, fontWeight:"bold", color:C.ink, marginBottom:12 }}>Impact Dimensions</div>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={impactDimData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dim" tick={{ fontSize:10 }} />
                    <Radar dataKey="score" stroke={C.teal} fill={C.teal} fillOpacity={0.25} />
                    <Tooltip formatter={(v: number) => [`${v}`, "Score"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Theme cloud */}
            {allThemes.length > 0 && (
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px" }}>
                <div style={{ fontSize:13, fontWeight:"bold", color:C.ink, marginBottom:12 }}>
                  Known Themes
                  <span style={{ fontSize:11, fontWeight:"normal", color:C.grey, marginLeft:8 }}>tagged across stories</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap" as const, gap:8 }}>
                  {allThemes.map(([theme, count]) => (
                    <button key={theme}
                      onClick={() => { setSearch(theme); setActiveTab("stories"); }}
                      style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontFamily:"Georgia,serif",
                        background:C.tealLight, color:C.teal, border:`1px solid ${C.border}`, cursor:"pointer" }}>
                      {theme}
                      <span style={{ fontSize:10, marginLeft:5, color:C.grey }}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* District breakdown */}
            {totalDistricts > 1 && (
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px" }}>
                <div style={{ fontSize:13, fontWeight:"bold", color:C.ink, marginBottom:12 }}>Stories by District</div>
                <div style={{ display:"flex", flexWrap:"wrap" as const, gap:8 }}>
                  {districts.filter(d => d !== "All").map(d => {
                    const cnt = stories.filter(s => s.district === d).length;
                    return (
                      <button key={d}
                        onClick={() => { setFilterDistrict(d); setActiveTab("stories"); }}
                        style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontFamily:"Georgia,serif",
                          background:C.paperDark, color:C.ink, border:`1px solid ${C.border}`, cursor:"pointer" }}>
                        {d} <span style={{ color:C.grey, fontSize:11 }}>({cnt})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ MAP ═══════════════════ */}
        {activeTab === "map" && (
          <div style={{ display:"flex", flexDirection:"column" as const, gap:20, animation:"fadeIn 0.3s ease" }}>
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px" }}>
              <h2 style={{ fontSize:15, fontWeight:"bold", color:C.teal, margin:"0 0 4px" }}>
                Maharashtra Story Map
              </h2>
              <p style={{ fontSize:12, color:C.grey, margin:"0 0 16px", lineHeight:1.6 }}>
                {totalStories} stories across {totalDistricts} district{totalDistricts !== 1 ? "s" : ""}. Click a district to read its narratives. Toggle between story count and impact score views.
              </p>
              <MaharashtraMap
                stories={stories.map(s => ({
                  id: s.id,
                  district: s.district,
                  validated: s.validated,
                  scores: s.scores || {},
                  narrative: s.narrative || "",
                  themes: s.themes || [],
                }))}
                onDistrictClick={d => { setFilterDistrict(d); }}
              />
            </div>
          </div>
        )}

        {/* ═══════════════════ STORIES ═══════════════════ */}
        {activeTab === "stories" && (
          <div style={{ display:"flex", flexDirection:"column" as const, gap:12, animation:"fadeIn 0.3s ease" }}>
            {/* Filter bar */}
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", display:"flex", flexWrap:"wrap" as const, gap:10, alignItems:"center" }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search narratives, themes, locations…"
                style={{ flex:1, minWidth:200, padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, fontFamily:"Georgia,serif", outline:"none" }} />
              <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
                style={{ padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, fontFamily:"Georgia,serif" }}>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterValidated} onChange={e => setFilterValidated(e.target.value)}
                style={{ padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, fontFamily:"Georgia,serif" }}>
                <option value="All">All stories</option>
                <option value="Validated">Validated only</option>
                <option value="Pending">Pending validation</option>
              </select>
              <select value={filterComposite} onChange={e => setFilterComposite(e.target.value)}
                style={{ padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, fontFamily:"Georgia,serif" }}>
                <option value="All">All composites</option>
                {Object.keys(COMPOSITES).map(c => <option key={c} value={c}>{c} ≥50</option>)}
              </select>
              {search && <button onClick={() => setSearch("")} style={{ fontSize:11, padding:"4px 8px", borderRadius:4, border:`1px solid ${C.border}`, cursor:"pointer", background:"transparent" }}>✕ Clear</button>}
              <div style={{ flex:1 }} />
              <button onClick={selectAll} style={{ fontSize:11, padding:"4px 10px", borderRadius:4, border:`1px solid ${C.border}`, cursor:"pointer", background:C.tealLight, color:C.teal }}>Select all</button>
              {selectedStories.size > 0 && (
                <>
                  <span style={{ fontSize:11, color:C.grey }}>{selectedStories.size} selected</span>
                  <button onClick={clearSelect} style={{ fontSize:11, padding:"4px 8px", borderRadius:4, border:`1px solid ${C.border}`, cursor:"pointer" }}>Clear</button>
                  <button onClick={() => runAnalysis("standard")} disabled={analysisLoading}
                    style={{ fontSize:12, padding:"5px 14px", borderRadius:5, border:"none", background:C.teal, color:"#fff", cursor:"pointer", fontFamily:"Georgia,serif", opacity:analysisLoading?0.5:1 }}>
                    {analysisLoading ? "Analysing…" : `✦ Analyse ${selectedStories.size} stories`}
                  </button>
                </>
              )}
            </div>

            {/* Story cards */}
            {filtered.length === 0 ? (
              <div style={{ padding:48, textAlign:"center" as const, color:C.grey, fontSize:14 }}>No stories match your filters.</div>
            ) : (
              filtered.map(s => {
                const isExpanded = expandedStory === s.id;
                const isSelected = selectedStories.has(s.id);
                const topScore = Object.entries(s.scores || {}).sort((a,b) => b[1]-a[1])[0];
                const col = topScore ? COMPOSITES[topScore[0]] : null;
                return (
                  <div key={s.id} style={{
                    background:C.white, border:`1.5px solid ${isSelected?C.teal:C.border}`,
                    borderLeft:`4px solid ${col?.b || C.teal}`,
                    borderRadius:8, overflow:"hidden", transition:"border-color 0.15s"
                  }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", cursor:"pointer" }}
                      onClick={() => setExpandedStory(isExpanded ? null : s.id)}>
                      <input type="checkbox" checked={isSelected}
                        onChange={e => { e.stopPropagation(); toggleSelect(s.id); }}
                        onClick={e => e.stopPropagation()}
                        style={{ marginTop:3, accentColor:C.teal, flexShrink:0, width:14, height:14 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6, marginBottom:6, alignItems:"center" }}>
                          <span style={{ fontSize:10, fontFamily:"monospace", color:C.grey }}>{s.id}</span>
                          {s.district && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:8, background:C.paperDark, color:C.ink }}>{s.district}</span>}
                          {s.village && <span style={{ fontSize:10, color:C.grey }}>{s.village}</span>}
                          {s.validated
                            ? <span style={{ fontSize:10, padding:"1px 7px", borderRadius:8, background:"#E8F5EE", color:C.teal, fontWeight:"bold" }}>✓ Validated</span>
                            : <span style={{ fontSize:10, padding:"1px 7px", borderRadius:8, background:C.amberLight, color:"#8A4A00" }}>Pending</span>}
                          {(s.themes || []).slice(0, 3).map(t => (
                            <span key={t} style={{ fontSize:10, padding:"1px 7px", borderRadius:8, background:C.tealLight, color:C.teal }}>{t}</span>
                          ))}
                        </div>
                        <p style={{ fontSize:13, color:C.inkLight, lineHeight:1.65, margin:0,
                          overflow:"hidden", display:"-webkit-box", WebkitLineClamp:isExpanded?undefined:2, WebkitBoxOrient:"vertical" as const }}>
                          {s.narrative ? `"${s.narrative}"` : <em style={{ color:C.grey }}>No narrative yet.</em>}
                        </p>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column" as const, gap:4, alignItems:"flex-end", flexShrink:0 }}>
                        {topScore && col && (
                          <div style={{ textAlign:"center" as const, padding:"4px 10px", background:col.bg, border:`1px solid ${col.b}`, borderRadius:6 }}>
                            <div style={{ fontSize:18, fontWeight:"bold", color:col.t }}>{topScore[1]}</div>
                            <div style={{ fontSize:9, color:col.t, lineHeight:1.2, maxWidth:70 }}>{topScore[0]}</div>
                          </div>
                        )}
                        <span style={{ fontSize:9, color:C.grey }}>{new Date(s.timestamp).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</span>
                      </div>
                    </div>

                    {/* Expanded score strip */}
                    {isExpanded && (
                      <div style={{ borderTop:`1px solid ${C.paperDark}`, padding:"12px 16px", background:C.paper }}>
                        <div style={{ fontSize:11, fontWeight:"bold", color:C.grey, marginBottom:8, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Composite Scores</div>
                        <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6 }}>
                          {Object.entries(s.scores || {}).map(([comp, sc]) => {
                            const c = COMPOSITES[comp];
                            if (!c) return null;
                            return (
                              <div key={comp} style={{ padding:"4px 10px", borderRadius:5, background:c.bg, border:`1px solid ${c.b}`, fontSize:11 }}>
                                <span style={{ color:c.t, fontWeight:"bold" }}>{sc}</span>
                                <span style={{ color:c.t, marginLeft:4, fontSize:10 }}>{comp}</span>
                              </div>
                            );
                          })}
                        </div>
                        {s.age_group && (
                          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:12, marginTop:10, fontSize:11, color:C.grey }}>
                            {[["Age", s.age_group],["Settlement",s.settlement_type],["Income",s.income_range],["Category",s.social_category],["Livelihood",s.livelihood]].filter(([,v])=>v).map(([k,v])=>(
                              <span key={k}><strong>{k}:</strong> {v}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ═══════════════════ AI THEME DISCOVERY ═══════════════════ */}
        {activeTab === "themes" && (
          <div style={{ display:"flex", flexDirection:"column" as const, gap:20, animation:"fadeIn 0.3s ease" }}>
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px" }}>
              <h2 style={{ fontSize:16, fontWeight:"bold", color:C.teal, margin:"0 0 6px" }}>AI Theme Discovery</h2>
              <p style={{ fontSize:13, color:C.grey, margin:"0 0 16px", lineHeight:1.6 }}>
                Select stories from the Stories tab, or analyse all filtered stories. The AI surfaces emerging themes that go beyond pre-coded composites — revealing unexpected patterns in the qualitative data.
              </p>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" as const, alignItems:"center" }}>
                <button onClick={() => runAnalysis("standard")} disabled={analysisLoading}
                  style={{ padding:"9px 20px", borderRadius:6, border:"none", background:C.teal, color:"#fff", cursor:analysisLoading?"not-allowed":"pointer", fontSize:13, fontFamily:"Georgia,serif", opacity:analysisLoading?0.5:1 }}>
                  {analysisLoading ? "Analysing…" : selectedStories.size > 0 ? `✦ Analyse ${selectedStories.size} selected` : `✦ Analyse ${Math.min(filtered.length,20)} stories`}
                </button>
                <button onClick={() => setShowCustom(!showCustom)}
                  style={{ padding:"9px 16px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:C.ink, cursor:"pointer", fontSize:13, fontFamily:"Georgia,serif" }}>
                  {showCustom ? "▲ Hide custom" : "▼ Custom question"}
                </button>
              </div>

              {showCustom && (
                <div style={{ marginTop:14, display:"flex", flexDirection:"column" as const, gap:8 }}>
                  <label style={{ fontSize:11, fontWeight:"bold", color:C.grey, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Custom analysis prompt</label>
                  <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Identify how this programme has affected children's outcomes. Focus on education, nutrition, and social mobility signals."
                    rows={3}
                    style={{ width:"100%", padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, fontFamily:"Georgia,serif", resize:"vertical", boxSizing:"border-box" as const }} />
                  <button onClick={() => runAnalysis("custom")} disabled={analysisLoading || !customPrompt.trim()}
                    style={{ alignSelf:"flex-start", padding:"7px 16px", borderRadius:6, border:"none", background:C.amber, color:C.teal, cursor:"pointer", fontSize:12, fontFamily:"Georgia,serif", opacity:(!customPrompt.trim()||analysisLoading)?0.5:1 }}>
                    Run Custom Analysis
                  </button>
                </div>
              )}
            </div>

            {analysisLoading && (
              <div style={{ display:"flex", alignItems:"center", gap:14, padding:24, background:C.white, border:`1px solid ${C.border}`, borderRadius:12 }}>
                <div style={{ width:28, height:28, border:`2px solid ${C.border}`, borderTop:`2px solid ${C.teal}`, borderRadius:"50%", animation:"spin 0.9s linear infinite", flexShrink:0 }} />
                <span style={{ fontSize:13, color:C.grey, fontStyle:"italic" }}>Reading {selectedStories.size > 0 ? selectedStories.size : Math.min(filtered.length,20)} narratives and surfacing patterns…</span>
              </div>
            )}

            {analysis && (
              <div style={{ display:"flex", flexDirection:"column" as const, gap:16, animation:"fadeIn 0.3s ease" }}>
                <div style={{ background:C.teal, color:"#fff", borderRadius:12, padding:"20px 22px" }}>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:4, textTransform:"uppercase" as const, letterSpacing:0.7 }}>Analysis</div>
                  <h3 style={{ fontSize:18, margin:"0 0 10px", fontFamily:"Georgia,serif" }}>{analysis.title}</h3>
                  <p style={{ fontSize:13, lineHeight:1.7, margin:0, color:"rgba(255,255,255,0.85)" }}>{analysis.summary}</p>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div style={{ background:C.amberLight, border:`1px solid ${C.amber}`, borderRadius:10, padding:"16px 18px" }}>
                    <div style={{ fontSize:10, fontWeight:"bold", color:"#8A4A00", textTransform:"uppercase" as const, letterSpacing:0.5, marginBottom:6 }}>Key Insight</div>
                    <p style={{ fontSize:13, color:"#5A2A00", lineHeight:1.65, margin:0 }}>{analysis.keyInsight}</p>
                  </div>
                  <div style={{ background:C.tealLight, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 18px" }}>
                    <div style={{ fontSize:10, fontWeight:"bold", color:C.teal, textTransform:"uppercase" as const, letterSpacing:0.5, marginBottom:6 }}>Policy Recommendation</div>
                    <p style={{ fontSize:13, color:C.ink, lineHeight:1.65, margin:0 }}>{analysis.recommendation}</p>
                  </div>
                </div>

                <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
                  <h3 style={{ fontSize:14, color:C.ink, margin:0 }}>Emerging Themes ({analysis.themes.length})</h3>
                  {analysis.themes.map((t, i) => (
                    <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.teal}`, borderRadius:8, padding:"14px 18px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap" as const, gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:14, fontWeight:"bold", color:C.teal }}>{t.name}</span>
                        <span style={{ fontSize:12, padding:"2px 10px", borderRadius:10, background:C.tealLight, color:C.teal }}>
                          {t.count} {t.count === 1 ? "story" : "stories"}
                        </span>
                      </div>
                      {t.evidence?.slice(0, 2).map((ev, j) => (
                        <blockquote key={j} style={{ margin:"4px 0", padding:"6px 12px", borderLeft:`2px solid ${C.amber}`, background:C.amberLight, fontSize:12, color:"#5A2A00", fontStyle:"italic", borderRadius:"0 4px 4px 0" }}>
                          "{ev}"
                        </blockquote>
                      ))}
                      {t.policyImplication && (
                        <p style={{ fontSize:11, color:C.grey, margin:"8px 0 0", fontStyle:"italic" }}>
                          🏛 Policy: {t.policyImplication}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!analysis && !analysisLoading && (
              <div style={{ padding:48, textAlign:"center" as const, color:C.grey, fontSize:14, background:C.white, border:`1px solid ${C.border}`, borderRadius:12 }}>
                Run an analysis above to discover themes across narratives.
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ POLICY SIGNALS ═══════════════════ */}
        {activeTab === "policy" && (
          <div style={{ display:"flex", flexDirection:"column" as const, gap:20, animation:"fadeIn 0.3s ease" }}>
            <div style={{ background:C.teal, borderRadius:12, padding:"22px 24px", color:"#fff" }}>
              <h2 style={{ fontSize:16, margin:"0 0 6px" }}>Policy Signals Dashboard</h2>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.7)", margin:0, lineHeight:1.6 }}>
                Aggregated quantitative signals distilled for policymakers. Based on {totalStories} stories from {totalDistricts} district{totalDistricts !== 1 ? "s" : ""}.
              </p>
            </div>

            {/* Top & bottom performers */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 18px" }}>
                <div style={{ fontSize:12, fontWeight:"bold", color:C.green, textTransform:"uppercase" as const, letterSpacing:0.5, marginBottom:10 }}>
                  ▲ Strongest outcomes
                </div>
                {compositeAvgs.slice(0, 4).map(({ name, score }) => {
                  const col = COMPOSITES[name];
                  return (
                    <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.paperDark}` }}>
                      <div>
                        <div style={{ fontSize:12, color:C.ink }}>{name}</div>
                        <div style={{ fontSize:10, color:C.grey }}>{IMPACT_DIMS[name]}</div>
                      </div>
                      <div style={{ fontSize:20, fontWeight:"bold", color:col.t, background:col.bg, padding:"3px 10px", borderRadius:6, border:`1px solid ${col.b}` }}>
                        {score}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 18px" }}>
                <div style={{ fontSize:12, fontWeight:"bold", color:C.amber, textTransform:"uppercase" as const, letterSpacing:0.5, marginBottom:10 }}>
                  ▼ Areas needing attention
                </div>
                {[...compositeAvgs].reverse().slice(0, 4).map(({ name, score }) => {
                  const col = COMPOSITES[name];
                  return (
                    <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.paperDark}` }}>
                      <div>
                        <div style={{ fontSize:12, color:C.ink }}>{name}</div>
                        <div style={{ fontSize:10, color:C.grey }}>{IMPACT_DIMS[name]}</div>
                      </div>
                      <div style={{ fontSize:20, fontWeight:"bold", color:col.t, background:col.bg, padding:"3px 10px", borderRadius:6, border:`1px solid ${col.b}` }}>
                        {score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Demographic breakdown */}
            {stories.some(s => s.age_group) && (
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 18px" }}>
                <div style={{ fontSize:13, fontWeight:"bold", color:C.ink, marginBottom:12 }}>Demographic Breakdown</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:14 }}>
                  {[
                    { label:"By Age Group", key:"age_group" },
                    { label:"By Settlement", key:"settlement_type" },
                    { label:"By Social Category", key:"social_category" },
                    { label:"By Livelihood", key:"livelihood" },
                  ].map(({ label, key }) => {
                    const counts = stories.reduce((acc, s) => {
                      const v = s[key as keyof Story] as string;
                      if (v) acc[v] = (acc[v] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
                    if (!sorted.length) return null;
                    return (
                      <div key={key}>
                        <div style={{ fontSize:11, fontWeight:"bold", color:C.grey, textTransform:"uppercase" as const, letterSpacing:0.5, marginBottom:6 }}>{label}</div>
                        {sorted.map(([val, cnt]) => (
                          <div key={val} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                            <div style={{ flex:1, height:6, background:C.paperDark, borderRadius:3, overflow:"hidden" }}>
                              <div style={{ height:"100%", background:C.teal, width:`${(cnt/totalStories)*100}%`, borderRadius:3 }} />
                            </div>
                            <span style={{ fontSize:10, color:C.grey, width:20 }}>{cnt}</span>
                            <span style={{ fontSize:10, color:C.ink, maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Validation rate */}
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 18px", display:"flex", gap:24, flexWrap:"wrap" as const }}>
              <div>
                <div style={{ fontSize:10, fontWeight:"bold", color:C.grey, textTransform:"uppercase" as const, letterSpacing:0.5, marginBottom:4 }}>Validation Rate</div>
                <div style={{ fontSize:28, fontWeight:"bold", color:C.teal, fontFamily:"Georgia,serif" }}>
                  {totalStories > 0 ? Math.round((validatedCount / totalStories) * 100) : 0}%
                </div>
                <div style={{ fontSize:11, color:C.grey }}>{validatedCount} of {totalStories} stories confirmed by participants</div>
              </div>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:10, fontWeight:"bold", color:C.grey, textTransform:"uppercase" as const, letterSpacing:0.5, marginBottom:8 }}>Score Distribution (all composites)</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
                  {[["≥80 Excellent", 80],["60–79 Strong",60],["40–59 Moderate",40],["<40 Weak",0]].map(([label, threshold]) => {
                    const count = Object.values(
                      stories.reduce((acc, s) => {
                        Object.entries(s.scores || {}).forEach(([c, v]) => {
                          const t = threshold as number;
                          const next = threshold === 0 ? v < 40 : (v >= t && v < (t + 20 === 80 ? 80 : t + 20 || 100));
                          if (next) acc[c] = (acc[c] || 0) + 1;
                        });
                        return acc;
                      }, {} as Record<string,number>)
                    ).reduce((a,b)=>a+b,0);
                    const col = threshold === 80 ? C.teal : threshold === 60 ? C.tealMid : threshold === 40 ? C.amber : C.red;
                    return (
                      <div key={label as string} style={{ padding:"4px 10px", borderRadius:5, background:C.paper, border:`1px solid ${C.border}`, fontSize:11 }}>
                        <span style={{ color:col, fontWeight:"bold" }}>{count}</span>
                        <span style={{ color:C.grey, marginLeft:4 }}>{label as string}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Export hint */}
            <div style={{ background:C.paperDark, borderRadius:8, padding:"12px 16px", display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:18 }}>📊</span>
              <div>
                <div style={{ fontSize:12, fontWeight:"bold", color:C.ink }}>Export & Integration</div>
                <div style={{ fontSize:11, color:C.grey, lineHeight:1.5 }}>
                  Use the Admin → Question Editor to export the full scoring configuration as JSON. Individual story data can be queried for further analysis in R, Python, or data platforms.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
