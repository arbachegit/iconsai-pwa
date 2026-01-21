/**
 * Memory Debug Panel (DEV mode only)
 * Shows real-time memory usage and cache statistics
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, RefreshCw, Activity, Database } from "lucide-react";
import { getMemoryStats, formatBytes, getMemoryStatusLabel, MemoryStats } from "@/lib/memory-monitor";
import { getCacheStats, clearAllCache, clearExpiredCache, formatAge } from "@/lib/regional-cache";

// Only render in development mode
const isDev = import.meta.env.DEV;

export function MemoryDebugPanel() {
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [cacheStats, setCacheStats] = useState<ReturnType<typeof getCacheStats> | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Update stats every 5 seconds
  useEffect(() => {
    if (!isDev) return;

    const updateStats = () => {
      setMemoryStats(getMemoryStats());
      setCacheStats(getCacheStats());
      setLastUpdate(new Date());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isDev) return null;

  const handleClearCache = () => {
    clearAllCache();
    setCacheStats(getCacheStats());
  };

  const handleClearExpired = () => {
    clearExpiredCache();
    setCacheStats(getCacheStats());
  };

  const handleRefresh = () => {
    setMemoryStats(getMemoryStats());
    setCacheStats(getCacheStats());
    setLastUpdate(new Date());
  };

  const status = getMemoryStatusLabel(memoryStats);
  const memoryPct = memoryStats?.isSupported ? Math.round(memoryStats.usagePct * 100) : 0;

  if (!isVisible) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm border-primary/30"
      >
        <Activity className="h-4 w-4 mr-1" />
        Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 bg-background/95 backdrop-blur-sm border-primary/30 shadow-xl">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Debug Panel
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleRefresh}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsVisible(false)}>
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="py-2 px-3 space-y-3">
        {/* Memory Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Memória JS</span>
            <Badge 
              variant="outline" 
              className={`text-[10px] px-1.5 ${
                status.color === 'red' ? 'border-red-500 text-red-500' :
                status.color === 'yellow' ? 'border-yellow-500 text-yellow-500' :
                'border-green-500 text-green-500'
              }`}
            >
              {status.emoji} {status.label}
            </Badge>
          </div>
          
          {memoryStats?.isSupported ? (
            <>
              <Progress 
                value={memoryPct} 
                className={`h-2 ${
                  status.color === 'red' ? '[&>div]:bg-red-500' :
                  status.color === 'yellow' ? '[&>div]:bg-yellow-500' :
                  '[&>div]:bg-green-500'
                }`}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{formatBytes(memoryStats.usedJSHeapSize)}</span>
                <span>{memoryPct}%</span>
                <span>{formatBytes(memoryStats.jsHeapSizeLimit)}</span>
              </div>
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">
              API de memória não suportada neste navegador
            </p>
          )}
        </div>

        {/* Cache Section */}
        <div className="space-y-1.5 border-t border-border/50 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3" />
              Cache Regional
            </span>
            <span className="text-[10px] text-muted-foreground">
              TTL: 30min
            </span>
          </div>
          
          {cacheStats && (
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-muted/50 rounded p-1.5 text-center">
                <div className="font-bold text-foreground">{cacheStats.entries}</div>
                <div className="text-muted-foreground">Entradas</div>
              </div>
              <div className="bg-muted/50 rounded p-1.5 text-center">
                <div className="font-bold text-foreground">{cacheStats.sizeKB.toFixed(1)} KB</div>
                <div className="text-muted-foreground">Tamanho</div>
              </div>
              {cacheStats.oldestAge && (
                <div className="bg-muted/50 rounded p-1.5 text-center">
                  <div className="font-bold text-foreground">{formatAge(cacheStats.oldestAge)}</div>
                  <div className="text-muted-foreground">Mais antiga</div>
                </div>
              )}
              {cacheStats.newestAge !== null && (
                <div className="bg-muted/50 rounded p-1.5 text-center">
                  <div className="font-bold text-foreground">{formatAge(cacheStats.newestAge)}</div>
                  <div className="text-muted-foreground">Mais recente</div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-1 pt-1">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-6 text-[10px] flex-1"
              onClick={handleClearExpired}
            >
              Limpar expirados
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              className="h-6 text-[10px]"
              onClick={handleClearCache}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[9px] text-muted-foreground/50 text-center border-t border-border/30 pt-1">
          Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')} • DEV only
        </div>
      </CardContent>
    </Card>
  );
}
