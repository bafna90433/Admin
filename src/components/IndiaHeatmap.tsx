import React, { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Tooltip } from "react-tooltip";

// ✅ FIX: 'import' ki jagah 'require' use kiya. 
// Ye TypeScript errors ko bypass kar dega.
const indiaTopo = require("./india-states.json"); 

const PROJECTION_CONFIG = {
  scale: 1200, 
  center: [78.9629, 22.5937], 
};

const STATE_NAME_TO_CODE: Record<string, string> = {
  "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", "Assam": "AS", "Bihar": "BR",
  "Chhattisgarh": "CG", "Chandigarh": "CH", "Delhi": "DL", "Goa": "GA", "Gujarat": "GJ",
  "Himachal Pradesh": "HP", "Haryana": "HR", "Jharkhand": "JH", "Jammu and Kashmir": "JK",
  "Karnataka": "KA", "Kerala": "KL", "Ladakh": "LA", "Maharashtra": "MH", "Meghalaya": "ML",
  "Manipur": "MN", "Madhya Pradesh": "MP", "Mizoram": "MZ", "Nagaland": "NL", "Odisha": "OD",
  "Punjab": "PB", "Puducherry": "PY", "Rajasthan": "RJ", "Sikkim": "SK", "Tamil Nadu": "TN",
  "Telangana": "TS", "Tripura": "TR", "Uttarakhand": "UK", "Uttar Pradesh": "UP", "West Bengal": "WB"
};

interface Props {
  stateStats: Record<string, number>;
}

const IndiaHeatmap: React.FC<Props> = ({ stateStats }) => {
  const [tooltipContent, setTooltipContent] = useState("");

  const maxVal = Math.max(...Object.values(stateStats), 1);

  const colorScale = scaleLinear<string>()
    .domain([0, maxVal])
    .range(["#2e2e48", "#6366f1"]); 

  return (
    <div style={{ width: "100%", height: "600px", position: "relative", background: "#1e1e2e", borderRadius: "12px", overflow: "hidden", display: "flex", justifyContent: "center" }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={PROJECTION_CONFIG as any}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={indiaTopo}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => {
              const stateName = geo.properties.st_nm || geo.properties.NAME_1 || geo.properties.name;
              const stateCode = STATE_NAME_TO_CODE[stateName];
              const value = stateStats[stateCode] || 0;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={value > 0 ? colorScale(value) : "#232334"} 
                  stroke="#43435c"
                  strokeWidth={0.8}
                  data-tooltip-id="map-tooltip"
                  data-tooltip-content={`${stateName}: ${value} Visitors`}
                  onMouseEnter={() => setTooltipContent(`${stateName}: ${value}`)}
                  onMouseLeave={() => setTooltipContent("")}
                  style={{
                    default: { outline: "none", transition: "all 0.3s" },
                    hover: { 
                      fill: "#22d3ee", 
                      outline: "none", 
                      cursor: "pointer",
                      stroke: "#fff",
                      strokeWidth: 1.5,
                      filter: "drop-shadow(0 0 5px #22d3ee)"
                    },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      <Tooltip 
        id="map-tooltip" 
        style={{ 
          backgroundColor: "#fff", 
          color: "#000", 
          borderRadius: "4px",
          fontWeight: "bold",
          fontSize: "13px",
          padding: "8px 12px"
        }} 
      />
    </div>
  );
};

export default IndiaHeatmap;