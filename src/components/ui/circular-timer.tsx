import { cn } from "@/lib/utils";

interface CircularTimerProps {
  timeLeft: number; // seconds
  totalTime: number; // seconds
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export const CircularTimer = ({ 
  timeLeft, 
  totalTime, 
  size = 120, 
  strokeWidth = 8,
  showLabel = true
}: CircularTimerProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.max(0, timeLeft / totalTime);
  const strokeDashoffset = circumference * (1 - progress);
  
  // Format time as MM:SS
  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  const isExpired = timeLeft <= 0;
  const isUrgent = timeLeft <= 30 && timeLeft > 0;
  
  // Color based on time remaining
  const getColor = () => {
    if (isExpired) return 'text-muted-foreground';
    if (isUrgent) return 'text-red-500';
    if (timeLeft <= 60) return 'text-amber-500';
    return 'text-emerald-500';
  };
  
  const getStrokeColor = () => {
    if (isExpired) return '#6b7280'; // gray-500
    if (isUrgent) return '#ef4444'; // red-500
    if (timeLeft <= 60) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  // Adaptive font size based on timer size
  const getFontSize = () => {
    if (size >= 140) return 'text-3xl';
    if (size >= 100) return 'text-2xl';
    return 'text-xl';
  };

  return (
    <div className={cn(
      "relative inline-flex items-center justify-center",
      isUrgent && "animate-pulse"
    )}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      {/* Time display */}
      <div className={cn(
        "absolute inset-0 flex flex-col items-center justify-center",
        getColor()
      )}>
        <span className={cn("font-bold font-mono", getFontSize())}>
          {isExpired ? "0:00" : timeDisplay}
        </span>
        {showLabel && (
          <span className="text-xs text-muted-foreground">
            {isExpired ? "expirado" : "restantes"}
          </span>
        )}
      </div>
    </div>
  );
};
