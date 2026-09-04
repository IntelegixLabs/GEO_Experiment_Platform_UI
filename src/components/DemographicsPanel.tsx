import React, { useEffect, useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { geoCentroid } from "d3-geo";
import { Tooltip } from "react-tooltip";
import { api } from "../api/client";

// Public CDN TopoJSON map
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface DemographicData {
  country: string;
  count: number;
}

export function DemographicsPanel() {
  const [data, setData] = useState<DemographicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const response = await api.getDemographics();
        setData(response.demographics || []);
      } catch (err: any) {
        setError(err.message || "Failed to load demographics data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute the scale for bubble sizes based on data counts
  const maxCount = useMemo(() => Math.max(1, ...(data || []).map((d) => d.count)), [data]);
  const sizeScale = scaleLinear().domain([1, maxCount]).range([4, 24]);

  return (
    <div className="panel" style={{ marginTop: "24px" }}>
      <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #e1e8ea", paddingBottom: "16px" }}>
        <p className="eyebrow" style={{ color: "#126166", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase", fontSize: "0.85rem" }}>
          Your survey reach
        </p>
        <p style={{ margin: 0, color: "#5e757a", fontSize: "0.95rem" }}>
          See your respondents' locations
        </p>
      </div>

      <div style={{ position: "relative", width: "100%", height: "500px", padding: "20px", background: "#fcfdfe" }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.7)", zIndex: 10 }}>
            Loading demographics...
          </div>
        )}
        {error && (
          <div style={{ padding: "12px", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px" }}>
            {error}
          </div>
        )}

        <ComposableMap
          projection="geoMercator"
          width={900}
          height={400}
          projectionConfig={{ scale: 140, center: [0, 20] }}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) => {
              // Map our database country names to TopoJSON geographies
              const mapMarkers = data.map((d) => {
                const geo = geographies.find(
                  (g) =>
                    g.properties.name.toLowerCase() === d.country.toLowerCase() ||
                    g.properties.name.toLowerCase().includes(d.country.toLowerCase()) ||
                    d.country.toLowerCase().includes(g.properties.name.toLowerCase())
                );
                
                // fallback to some common mismatches
                let fallbackGeo = null;
                if (!geo) {
                   if (d.country === "US" || d.country.includes("United States")) fallbackGeo = geographies.find(g => g.properties.name === "United States of America");
                   if (d.country === "UK" || d.country.includes("United Kingdom")) fallbackGeo = geographies.find(g => g.properties.name === "United Kingdom");
                }

                const targetGeo = geo || fallbackGeo;
                if (!targetGeo) return null;

                const centroid = geoCentroid(targetGeo);
                return {
                  id: d.country,
                  country: targetGeo.properties.name,
                  originalCountry: d.country,
                  count: d.count,
                  coordinates: centroid as [number, number],
                };
              }).filter(Boolean) as any[];

              return (
                <>
                  {geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#f0f2f3"
                      stroke="#d1d9dc"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: "#e1e8ea" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))}
                  
                  {mapMarkers.map((marker) => (
                    <Marker key={marker.id} coordinates={marker.coordinates}>
                      <circle
                        r={sizeScale(marker.count)}
                        fill="#52a799"
                        opacity={0.85}
                        stroke="#ffffff"
                        strokeWidth={1}
                        data-tooltip-id="demographics-tooltip"
                        data-tooltip-content={`${marker.country}: ${marker.count} respondents`}
                        style={{ cursor: "pointer", outline: "none", transition: "all 250ms" }}
                        onMouseEnter={(e) => {
                           e.currentTarget.style.opacity = "1";
                           e.currentTarget.style.strokeWidth = "2px";
                        }}
                        onMouseLeave={(e) => {
                           e.currentTarget.style.opacity = "0.85";
                           e.currentTarget.style.strokeWidth = "1px";
                        }}
                      />
                    </Marker>
                  ))}
                </>
              );
            }}
          </Geographies>
        </ComposableMap>
        
        <Tooltip id="demographics-tooltip" style={{ backgroundColor: "#163b43", color: "#fff", borderRadius: "4px", padding: "6px 12px", fontSize: "0.85rem", zIndex: 100 }} />
      </div>
    </div>
  );
}
