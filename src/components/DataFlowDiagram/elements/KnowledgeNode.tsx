import React from "react";
import { KnowledgeItem } from "../data/diagramData";

interface KnowledgeNodeProps {
  item: KnowledgeItem;
  x: number;
  y: number;
  isHighlighted: boolean;
  isConnected: boolean;
  onHover: (element: KnowledgeItem | null, event?: React.MouseEvent) => void;
  onClick: (element: KnowledgeItem) => void;
}

export const KnowledgeNode: React.FC<KnowledgeNodeProps> = ({
  item,
  x,
  y,
  isHighlighted,
  isConnected,
  onHover,
  onClick,
}) => {
  const Icon = item.icon;
  
  const nodeWidth = 150;
  const nodeHeight = 50;
  const opacity = isHighlighted ? 1 : 0.4;
  const scale = isConnected ? 1.05 : 1;
  const glowIntensity = isConnected ? 8 : 0;

  const bgColor = "#7c3aed";
  const borderColor = "#a78bfa";
  const textColor = "#f5f3ff";

  return (
    <g
      transform={`translate(${x - nodeWidth / 2}, ${y - nodeHeight / 2}) scale(${scale})`}
      style={{ opacity, cursor: "pointer", transition: "all 0.2s ease" }}
      onMouseEnter={(e) => onHover(item, e)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(item);
      }}
    >
      <rect
        width={nodeWidth}
        height={nodeHeight}
        rx={10}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={1.5}
        style={{
          filter: glowIntensity > 0 ? `drop-shadow(0 0 ${glowIntensity}px ${borderColor})` : undefined,
        }}
      />
      
      <foreignObject x={12} y={(nodeHeight - 20) / 2} width={20} height={20}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon 
            size={18} 
            color={textColor}
          />
        </div>
      </foreignObject>
      
      <text
        x={38}
        y={nodeHeight / 2 + 4}
        fill={textColor}
        fontSize={11}
        fontWeight={600}
      >
        {item.name.length > 18 ? item.name.substring(0, 16) + "..." : item.name}
      </text>
    </g>
  );
};
