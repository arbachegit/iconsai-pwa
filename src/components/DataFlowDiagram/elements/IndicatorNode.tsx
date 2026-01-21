import React from "react";
import { MunicipalIndicator } from "../data/diagramData";

interface IndicatorNodeProps {
  indicator: MunicipalIndicator;
  x: number;
  y: number;
  isHighlighted: boolean;
  isConnected: boolean;
  onHover: (element: MunicipalIndicator | null, event?: React.MouseEvent) => void;
  onClick: (element: MunicipalIndicator) => void;
}

export const IndicatorNode: React.FC<IndicatorNodeProps> = ({
  indicator,
  x,
  y,
  isHighlighted,
  isConnected,
  onHover,
  onClick,
}) => {
  const Icon = indicator.icon;
  
  const nodeWidth = 160;
  const nodeHeight = 44;
  const opacity = isHighlighted ? 1 : 0.4;
  const scale = isConnected ? 1.05 : 1;
  const glowIntensity = isConnected ? 8 : 0;

  const bgColor = "#0891b2";
  const borderColor = "#22d3ee";
  const textColor = "#ecfeff";

  return (
    <g
      transform={`translate(${x - nodeWidth / 2}, ${y - nodeHeight / 2}) scale(${scale})`}
      style={{ opacity, cursor: "pointer", transition: "all 0.2s ease" }}
      onMouseEnter={(e) => onHover(indicator, e)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(indicator);
      }}
    >
      <rect
        width={nodeWidth}
        height={nodeHeight}
        rx={8}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={1.5}
        style={{
          filter: glowIntensity > 0 ? `drop-shadow(0 0 ${glowIntensity}px ${borderColor})` : undefined,
        }}
      />
      
      <foreignObject x={10} y={(nodeHeight - 18) / 2} width={18} height={18}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon 
            size={16} 
            color={textColor}
          />
        </div>
      </foreignObject>
      
      <text
        x={34}
        y={nodeHeight / 2}
        fill={textColor}
        fontSize={10}
        fontWeight={600}
      >
        {indicator.name.length > 22 ? indicator.name.substring(0, 20) + "..." : indicator.name}
      </text>
      
      <text
        x={34}
        y={nodeHeight / 2 + 12}
        fill={textColor}
        fontSize={8}
        opacity={0.7}
      >
        Per municipality
      </text>
    </g>
  );
};
