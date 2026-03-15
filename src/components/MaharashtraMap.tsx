import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

// ─── DISTRICT CENTROIDS (lat/lng approx) ─────────────────────────────────────
const DISTRICT_CENTROIDS: Record<string, [number, number]> = {
  "Ahmednagar":       [74.75, 19.08],
  "Akola":            [77.07, 20.71],
  "Amravati":         [77.77, 20.92],
  "Aurangabad":       [75.34, 19.88],
  "Beed":             [75.76, 18.99],
  "Bhandara":         [79.65, 21.17],
  "Buldhana":         [76.18, 20.53],
  "Chandrapur":       [79.30, 19.96],
  "Dhule":            [74.78, 20.90],
  "Gadchiroli":       [80.17, 20.10],
  "Gondia":           [80.20, 21.46],
  "Hingoli":          [77.15, 19.72],
  "Jalgaon":          [75.56, 21.01],
  "Jalna":            [75.88, 19.84],
  "Kolhapur":         [74.24, 16.70],
  "Latur":            [76.56, 18.40],
  "Mumbai City":      [72.88, 18.96],
  "Mumbai Suburban":  [72.87, 19.07],
  "Nagpur":           [79.09, 21.15],
  "Nanded":           [77.32, 19.15],
  "Nandurbar":        [74.24, 21.37],
  "Nashik":           [73.79, 20.00],
  "Osmanabad":        [76.04, 18.18],
  "Palghar":          [72.76, 19.70],
  "Parbhani":         [76.78, 19.26],
  "Pune":             [73.86, 18.52],
  "Raigad":           [73.18, 18.52],
  "Ratnagiri":        [73.30, 17.00],
  "Sangli":           [74.57, 16.86],
  "Satara":           [74.00, 17.68],
  "Sindhudurg":       [73.64, 16.35],
  "Solapur":          [75.91, 17.68],
  "Thane":            [73.02, 19.22],
  "Wardha":           [78.60, 20.75],
  "Washim":           [77.13, 20.11],
  "Yavatmal":         [78.12, 20.40],
};

// Simplified Maharashtra GeoJSON outline (district-level polygons)
// Using a TopoJSON-compatible URL from a public source
const MH_GEO_URL = "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-states.json";

interface DistrictData {
  count: number;
  avgScore: number;
  validated: number;
  topThemes: string[];
  stories: { id: string; narrative: string; themes: string[] }[];
}

interface MaharashtraMapProps {
  stories: {
    id: string;
    district: string;
    validated: boolean;
    scores: Record<string, number>;
    narrative: string;
    themes: string[];
  }[];
  onDistrictClick?: (district: string) => void;
}

const C = {
  teal: "#0D2818",
  tealMid: "#2E7D52",
  tealLight: "#E8F5EE",
  amber: "#E8A020",
  amberLight: "#FEF3DC",
  paper: "#F9F7F4",
  paperDark: "#EDE9E3",
  white: "#FFFFFF",
  grey: "#8A8A9A",
  border: "#C8D8C8",
  ink: "#0D2818",
  red: "#B03020",
};

function scoreToColor(score: number, count: number): string {
  if (count === 0) return "#EDE9E3";
  if (score >= 75) return "#0D2818";
  if (score >= 65) return "#1B5E3A";
  if (score >= 55) return "#2E7D52";
  if (score >= 45) return "#5BA87A";
  if (score >= 35) return "#A8D4B8";
  return "#D8EDE0";
}

function scoreToCountColor(count: number): string {
  if (count === 0) return "#F0EEE8";
  if (count >= 5)  return "#0D2818";
  if (count >= 3)  return "#2E7D52";
  if (count >= 2)  return "#5BA87A";
  return "#A8D4B8";
}

export default function MaharashtraMap({ stories, onDistrictClick }: MaharashtraMapProps) {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"count" | "score">("count");

  // Aggregate by district
  const districtData = useMemo(() => {
    const data: Record<string, DistrictData> = {};
    for (const s of stories) {
      const d = s.district;
      if (!d) continue;
      if (!data[d]) data[d] = { count: 0, avgScore: 0, validated: 0, topThemes: [], stories: [] };
      data[d].count++;
      if (s.validated) data[d].validated++;
      const scoreVals = Object.values(s.scores || {}).filter((v): v is number => typeof v === "number" && v > 0);
      if (scoreVals.length) data[d].avgScore = (data[d].avgScore * (data[d].count - 1) + scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) / data[d].count;
      data[d].stories.push({ id: s.id, narrative: s.narrative, themes: s.themes || [] });
    }
    // Top themes per district
    for (const d of Object.keys(data)) {
      const themeCounts: Record<string, number> = {};
      data[d].stories.forEach(s => s.themes.forEach(t => { themeCounts[t] = (themeCounts[t] || 0) + 1; }));
      data[d].topThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
    }
    return data;
  }, [stories]);

  const activeDistrict = selectedDistrict || hoveredDistrict;
  const activeData = activeDistrict ? districtData[activeDistrict] : null;

  const markers = useMemo(() =>
    Object.entries(DISTRICT_CENTROIDS)
      .filter(([d]) => districtData[d] && districtData[d].count > 0)
      .map(([district, coords]) => ({
        district,
        coords,
        data: districtData[district],
      })),
    [districtData]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
        <span style={{ fontSize: 11, fontWeight: "bold", color: C.grey, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Colour by</span>
        {(["count", "score"] as const).map(m => (
          <button key={m} onClick={() => setMapMode(m)}
            style={{ padding: "4px 12px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 12,
              background: mapMode === m ? C.teal : "transparent", color: mapMode === m ? "#fff" : C.ink,
              cursor: "pointer", fontFamily: "Georgia,serif" }}>
            {m === "count" ? "Story Count" : "Impact Score"}
          </button>
        ))}
        {selectedDistrict && (
          <button onClick={() => setSelectedDistrict(null)}
            style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11, cursor: "pointer", background: "transparent", color: C.grey }}>
            ✕ Clear selection
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
        {/* Map */}
        <div style={{ background: "#EAF0E8", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", position: "relative" as const }}>
          {/* Legend */}
          <div style={{ position: "absolute" as const, bottom: 12, left: 12, background: "rgba(255,255,255,0.95)", borderRadius: 6, padding: "8px 10px", border: `1px solid ${C.border}`, zIndex: 10 }}>
            <div style={{ fontSize: 9, fontWeight: "bold", color: C.grey, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 }}>
              {mapMode === "count" ? "Stories" : "Avg Score"}
            </div>
            {mapMode === "count" ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[["0","#F0EEE8"],["1","#A8D4B8"],["2","#5BA87A"],["3-4","#2E7D52"],["5+","#0D2818"]].map(([label, color]) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2 }}>
                    <div style={{ width: 14, height: 14, background: color, borderRadius: 2 }} />
                    <span style={{ fontSize: 8, color: C.grey }}>{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[["<35","#D8EDE0"],["35","#A8D4B8"],["45","#5BA87A"],["55","#2E7D52"],["65","#1B5E3A"],["75+","#0D2818"]].map(([label, color]) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2 }}>
                    <div style={{ width: 14, height: 14, background: color, borderRadius: 2 }} />
                    <span style={{ fontSize: 8, color: C.grey }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [76.5, 19.2], scale: 3400 }}
            width={700}
            height={500}
            style={{ width: "100%", height: "auto" }}
          >
            <ZoomableGroup>
              {/* District circles as markers (one per district with data) */}
              {Object.entries(DISTRICT_CENTROIDS).map(([district, [lng, lat]]) => {
                const data = districtData[district];
                const count = data?.count || 0;
                const score = data ? Math.round(data.avgScore) : 0;
                const fillColor = mapMode === "count" ? scoreToCountColor(count) : scoreToColor(score, count);
                const isHovered = hoveredDistrict === district;
                const isSelected = selectedDistrict === district;
                const radius = count > 0 ? Math.min(6 + count * 2.5, 22) : 4;

                return (
                  <Marker key={district} coordinates={[lng, lat]}>
                    <circle
                      r={isSelected || isHovered ? radius + 2 : radius}
                      fill={count > 0 ? fillColor : "#D0D8D0"}
                      stroke={isSelected ? C.amber : isHovered ? "#fff" : "rgba(255,255,255,0.5)"}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0.8}
                      style={{ cursor: count > 0 ? "pointer" : "default", transition: "all 0.15s" }}
                      onMouseEnter={() => setHoveredDistrict(district)}
                      onMouseLeave={() => setHoveredDistrict(null)}
                      onClick={() => {
                        if (count > 0) {
                          setSelectedDistrict(district === selectedDistrict ? null : district);
                          onDistrictClick?.(district);
                        }
                      }}
                    />
                    {count > 0 && (
                      <text
                        textAnchor="middle"
                        y={1}
                        style={{ fontSize: count > 4 ? 8 : 7, fill: count >= 3 ? "#fff" : C.ink, pointerEvents: "none", fontWeight: "bold", fontFamily: "sans-serif" }}
                      >
                        {count}
                      </text>
                    )}
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          {/* Tooltip */}
          {hoveredDistrict && districtData[hoveredDistrict] && (
            <div style={{
              position: "absolute" as const, top: 12, right: 12, background: C.white, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "10px 14px", minWidth: 160, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", zIndex: 20
            }}>
              <div style={{ fontWeight: "bold", fontSize: 13, color: C.teal, marginBottom: 4 }}>{hoveredDistrict}</div>
              <div style={{ fontSize: 12, color: C.grey, marginBottom: 2 }}>
                {districtData[hoveredDistrict].count} {districtData[hoveredDistrict].count === 1 ? "story" : "stories"}
              </div>
              <div style={{ fontSize: 12, color: C.grey, marginBottom: 4 }}>
                Avg score: <strong style={{ color: C.ink }}>{Math.round(districtData[hoveredDistrict].avgScore)}</strong>
              </div>
              {districtData[hoveredDistrict].topThemes.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 3 }}>
                  {districtData[hoveredDistrict].topThemes.map(t => (
                    <span key={t} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 6, background: C.tealLight, color: C.teal }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div style={{ width: 200, display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {/* Summary stats */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: "bold", color: C.grey, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8 }}>Coverage</div>
            <div style={{ fontSize: 22, fontWeight: "bold", color: C.teal, fontFamily: "Georgia,serif" }}>
              {Object.keys(districtData).length}
              <span style={{ fontSize: 12, color: C.grey, fontWeight: "normal" }}> / 36</span>
            </div>
            <div style={{ fontSize: 10, color: C.grey }}>districts with stories</div>
          </div>

          {/* District list */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", maxHeight: 340, overflowY: "auto" as const }}>
            <div style={{ fontSize: 11, fontWeight: "bold", color: C.grey, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8 }}>All Districts</div>
            {Object.entries(districtData)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([d, data]) => (
                <div key={d}
                  onClick={() => { setSelectedDistrict(d === selectedDistrict ? null : d); onDistrictClick?.(d); }}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "5px 0", borderBottom: `1px solid ${C.paperDark}`, cursor: "pointer",
                    background: selectedDistrict === d ? C.tealLight : "transparent",
                    borderRadius: 4, paddingLeft: selectedDistrict === d ? 6 : 0
                  }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.ink, fontWeight: selectedDistrict === d ? "bold" : "normal" }}>{d}</div>
                    <div style={{ fontSize: 9, color: C.grey }}>score {Math.round(data.avgScore)}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: "bold", color: C.teal, padding: "1px 6px", borderRadius: 4, background: C.tealLight }}>
                    {data.count}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Selected district detail */}
      {selectedDistrict && activeData && (
        <div style={{ background: C.white, border: `1.5px solid ${C.teal}`, borderRadius: 12, padding: "16px 20px", animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: "bold", color: C.teal, margin: "0 0 2px" }}>{selectedDistrict}</h3>
              <div style={{ fontSize: 12, color: C.grey }}>
                {activeData.count} {activeData.count === 1 ? "story" : "stories"} · {activeData.validated} validated · avg score {Math.round(activeData.avgScore)}
              </div>
            </div>
            {activeData.topThemes.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, maxWidth: 200, justifyContent: "flex-end" }}>
                {activeData.topThemes.map(t => (
                  <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: C.amberLight, color: "#8A4A00" }}>{t}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {activeData.stories.slice(0, 3).map(s => (
              <div key={s.id} style={{ padding: "8px 12px", background: C.paper, borderRadius: 6, borderLeft: `3px solid ${C.teal}` }}>
                <div style={{ fontSize: 10, color: C.grey, marginBottom: 3, fontFamily: "monospace" }}>{s.id}</div>
                <p style={{ fontSize: 12, color: "#2A4A2A", margin: 0, lineHeight: 1.6,
                  overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                  {s.narrative ? `"${s.narrative}"` : <em>No narrative yet.</em>}
                </p>
              </div>
            ))}
            {activeData.stories.length > 3 && (
              <div style={{ fontSize: 11, color: C.grey, textAlign: "center" as const }}>
                +{activeData.stories.length - 3} more stories in this district
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
