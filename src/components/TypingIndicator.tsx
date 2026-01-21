interface TypingIndicatorProps {
  isDrawing?: boolean;
}

export const TypingIndicator = ({ isDrawing = false }: TypingIndicatorProps) => {
  return (
    <div className="flex items-center gap-2 p-4 bg-card/30 rounded-lg border border-border/50 w-fit animate-fade-in">
      <div className="flex gap-1">
        <div 
          className={`w-2 h-2 rounded-full animate-bounce ${
            isDrawing ? "bg-purple-500" : "bg-primary"
          }`}
          style={{ animationDelay: '0ms', animationDuration: '1s' }}
        />
        <div 
          className={`w-2 h-2 rounded-full animate-bounce ${
            isDrawing ? "bg-purple-500" : "bg-primary"
          }`}
          style={{ animationDelay: '200ms', animationDuration: '1s' }}
        />
        <div 
          className={`w-2 h-2 rounded-full animate-bounce ${
            isDrawing ? "bg-purple-500" : "bg-primary"
          }`}
          style={{ animationDelay: '400ms', animationDuration: '1s' }}
        />
      </div>
      <span className="text-sm text-muted-foreground">
        {isDrawing ? "Desenhando..." : "Digitando..."}
      </span>
    </div>
  );
};
