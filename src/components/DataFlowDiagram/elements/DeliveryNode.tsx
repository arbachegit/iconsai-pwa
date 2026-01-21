import React from "react";
import { DeliveryPanel } from "../data/diagramData";

interface DeliveryNodeProps {
  panel: DeliveryPanel;
  x: number;
  y: number;
  isHighlighted: boolean;
  isConnected: boolean;
  onHover: (element: DeliveryPanel | null, event?: React.MouseEvent) => void;
  onClick: (element: DeliveryPanel) => void;
}

export const DeliveryNode: React.FC<DeliveryNodeProps> = ({
  panel,
  x,
  y,
  isHighlighted,
  isConnected,
  onHover,
  onClick,
}) => {
  const Icon = panel.icon;
  
  const nodeWidth = 150;
  const nodeHeight = 60;
  const opacity = isHighlighted ? 1 : 0.4;
  const scale = isConnected ? 1.05 : 1;
  const glowIntensity = isConnected ? 8 : 0;

  const bgColor = "#059669";
  const borderColor = "#34d399";
  const textColor = "#ecfdf5";

  return (
    <g
      transform={`translate(${x - nodeWidth / 2}, ${y - nodeHeight / 2}) scale(${scale})`}
      style={{ opacity, cursor: "pointer", transition: "all 0.2s ease" }}
      onMouseEnter={(e) => onHover(panel, e)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(panel);
      }}
    >
      <rect
        width={nodeWidth}
        height={nodeHeight}
        rx={12}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={2}
        style={{
          filter: glowIntensity > 0 ? `drop-shadow(0 0 ${glowIntensity}px ${borderColor})` : undefined,
        }}
      />
      
      <line
        x1={0}
        y1={4}
        x2={nodeWidth}
        y2={4}
        stroke={borderColor}
        strokeWidth={3}
        strokeLinecap="round"
      />
      
      <foreignObject x={12} y={14} width={24} height={24}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon 
            size={20} 
            color={textColor}
          />
        </div>
      </foreignObject>
      
      <text
        x={42}
        y={30}
        fill={textColor}
        fontSize={12}
        fontWeight={700}
      >
        {panel.name}
      </text>
      
      <text
        x={nodeWidth / 2}
        y={nodeHeight - 10}
        fill={textColor}
        fontSize={8}
        opacity={0.7}
        textAnchor="middle"
      >
        Click to see benefits
      </text>
    </g>
  );
};
