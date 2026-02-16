import React, { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Tooltip } from "react-tooltip";

// ✅ Load JSON Data
const indiaTopo = require("./india-states.json");

// ✅ Compact Projection Config
const PROJECTION_CONFIG = {
  scale: 1000,
  center: [78.9629, 22.5937], // Centered on India
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

  // ✅ Colorful Gradient Scale (Light Blue -> Deep 3D Blue)
  const colorScale = scaleLinear<string>()
    .domain([0, maxVal])
    .range(["#E9EDF7", "#4318FF"]);

  return (
    <div
      style={{
        width: "100%",
        height: "380px", // ✅ Compact Height
        position: "relative",
        background: "transparent",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={PROJECTION_CONFIG as any}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={indiaTopo}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => {
              const stateName =
                geo.properties.st_nm ||
                geo.properties.NAME_1 ||
                geo.properties.name;
              const stateCode = STATE_NAME_TO_CODE[stateName];
              const value = stateStats[stateCode] || 0;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  data-tooltip-id="map-tooltip"
                  data-tooltip-content={`${stateName}: ${value} Visitors`}
                  onMouseEnter={() =>
                    setTooltipContent(`${stateName}: ${value}`)
                  }
                  onMouseLeave={() => setTooltipContent("")}
                  style={{
                    default: {
                      fill: value > 0 ? colorScale(value) : "#F4F7FE", // Light background for empty states
                      stroke: "#FFFFFF",
                      strokeWidth: 1,
                      outline: "none",
                      // ✅ 3D Drop Shadow Effect
                      filter: "drop-shadow(2px 3px 4px rgba(0, 0, 0, 0.15))",
                      transition: "all 0.3s ease",
                    },
                    hover: {
                      fill: "#7551FF", // Bright Purple on Hover
                      stroke: "#fff",
                      strokeWidth: 2,
                      outline: "none",
                      cursor: "pointer",
                      // ✅ Lift Effect on Hover
                      transform: "translateY(-4px) scale(1.02)",
                      filter: "drop-shadow(4px 6px 8px rgba(67, 24, 255, 0.4))",
                      zIndex: 10,
                    },
                    pressed: {
                      fill: "#2B3674",
                      outline: "none",
                      transform: "translateY(0px)",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* ✅ Styled Tooltip */}
      <Tooltip
        id="map-tooltip"
        style={{
          backgroundColor: "#2B3674",
          color: "#fff",
          borderRadius: "8px",
          fontWeight: "600",
          fontSize: "12px",
          padding: "8px 12px",
          boxShadow: "0px 4px 12px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
};

export default IndiaHeatmap;