import React from "react";
import { DataSource, domainColors } from "../data/diagramData";

interface SourceNodeProps {
  source: DataSource;
  x: number;
  y: number;
  isHighlighted: boolean;
  isConnected: boolean;
  onHover: (element: DataSource | null, event?: React.MouseEvent) => void;
  onClick: (element: DataSource) => void;
}

export const SourceNode: React.FC<SourceNodeProps> = ({
  source,
  x,
  y,
  isHighlighted,
  isConnected,
  onHover,
  onClick,
}) => {
  const colors = domainColors[source.domain];
  const Icon = source.icon;
  
  const nodeWidth = 140;
  const nodeHeight = 32;
  const opacity = isHighlighted ? 1 : 0.4;
  const scale = isConnected ? 1.05 : 1;
  const glowIntensity = isConnected ? 8 : 0;

  return (
    <g
      transform={`translate(${x - nodeWidth / 2}, ${y - nodeHeight / 2}) scale(${scale})`}
      style={{ opacity, cursor: "pointer", transition: "all 0.2s ease" }}
      onMouseEnter={(e) => onHover(source, e)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(source);
      }}
    >
      <rect
        width={nodeWidth}
        height={nodeHeight}
        rx={6}
        fill={colors.bg}
        stroke={colors.border}
        strokeWidth={1.5}
        style={{
          filter: glowIntensity > 0 ? `drop-shadow(0 0 ${glowIntensity}px ${colors.border})` : undefined,
        }}
      />
      
      <foreignObject x={8} y={(nodeHeight - 16) / 2} width={16} height={16}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon 
            size={14} 
            color={colors.text}
          />
        </div>
      </foreignObject>
      
      <text
        x={30}
        y={nodeHeight / 2 + 4}
        fill={colors.text}
        fontSize={11}
        fontWeight={500}
      >
        {source.name}
      </text>
    </g>
  );
};
