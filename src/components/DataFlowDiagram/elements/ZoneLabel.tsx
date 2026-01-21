import React from "react";
import { ZoneType } from "../data/diagramData";

interface ZoneLabelProps {
  zone: ZoneType;
  label: string;
  x: number;
  y: number;
  isHighlighted: boolean;
}

const zoneColors: Record<ZoneType, string> = {
  sources: "#3b82f6",
  content: "#60a5fa",
  indicators: "#22d3ee",
  knowledge: "#a78bfa",
  delivery: "#34d399",
};

export const ZoneLabel: React.FC<ZoneLabelProps> = ({
  zone,
  label,
  x,
  y,
  isHighlighted,
}) => {
  const color = zoneColors[zone];
  const opacity = isHighlighted ? 1 : 0.4;

  return (
    <g style={{ opacity, transition: "opacity 0.3s ease" }}>
      <text
        x={x}
        y={y}
        fill={color}
        fontSize={13}
        fontWeight={700}
        textAnchor="middle"
        letterSpacing="0.5px"
      >
        {label}
      </text>
      <line
        x1={x - 50}
        y1={y + 8}
        x2={x + 50}
        y2={y + 8}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.5}
      />
    </g>
  );
};
