import React from "react";

interface FlowConnectorProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isHighlighted: boolean;
  isActive: boolean;
}

const getGradientColor = (x: number, width: number): string => {
  const progress = x / width;
  const colors = ["#3b82f6", "#60a5fa", "#22d3ee", "#a78bfa", "#34d399"];
  const index = Math.min(Math.floor(progress * colors.length), colors.length - 1);
  return colors[index];
};

export const FlowConnector: React.FC<FlowConnectorProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  isHighlighted,
  isActive,
}) => {
  const opacity = isHighlighted ? 0.8 : 0.2;
  const strokeWidth = isActive ? 2.5 : 1.5;
  
  const dx = toX - fromX;
  const midX = fromX + dx * 0.5;
  
  const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  
  const gradientId = `gradient-${fromX}-${fromY}-${toX}-${toY}`.replace(/\./g, "-");
  const fromColor = getGradientColor(fromX, 1600);
  const toColor = getGradientColor(toX, 1600);

  return (
    <g style={{ opacity }}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={fromColor} />
          <stop offset="100%" stopColor={toColor} />
        </linearGradient>
        <filter id={`glow-${gradientId}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        </filter>
      </defs>
      
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      
      {isHighlighted && (
        <path
          d={path}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
          style={{ filter: `url(#glow-${gradientId})`, opacity: 0.5 }}
        />
      )}
    </g>
  );
};
