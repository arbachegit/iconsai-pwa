import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, Pencil, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface IndicatorValue {
  id: string;
  reference_date: string;
  value: number;
}

interface MonthlyMatrixViewProps {
  indicatorId: string;
  values: IndicatorValue[];
  unit: string | null;
  onValueChange: () => void;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function MonthlyMatrixView({ indicatorId, values, unit, onValueChange }: MonthlyMatrixViewProps) {
  const [editingCell, setEditingCell] = useState<{ year: number; month: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  logger.debug(`[MonthlyMatrixView] Indicator: ${indicatorId}, Received ${values.length} values`);

  // Build matrix data: { year: { month: IndicatorValue } }
  const matrixData = useMemo(() => {
    const data: Record<number, Record<number, IndicatorValue>> = {};
    const years = new Set<number>();

    values.forEach(v => {
      const year = parseInt(v.reference_date.substring(0, 4));
      const month = parseInt(v.reference_date.substring(5, 7)) - 1; // 0-11
      years.add(year);

      if (!data[year]) data[year] = {};
      data[year][month] = v;
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    logger.debug(`[MonthlyMatrixView] Processed ${values.length} values into ${sortedYears.length} years`);
    return { data, years: sortedYears };
  }, [values]);

  // Calculate annual average
  const calcAnnualAverage = (year: number): number | null => {
    const yearData = matrixData.data[year];
    if (!yearData) return null;

    const monthValues = Object.values(yearData).map(v => v.value);
    if (monthValues.length === 0) return null;

    return monthValues.reduce((a, b) => a + b, 0) / monthValues.length;
  };

  // Calculate annual variation
  const calcAnnualVariation = (year: number): number | null => {
    const currentAvg = calcAnnualAverage(year);
    const previousAvg = calcAnnualAverage(year - 1);

    if (currentAvg === null || previousAvg === null || previousAvg === 0) return null;
    return ((currentAvg - previousAvg) / Math.abs(previousAvg)) * 100;
  };

  const getValueForCell = (year: number, month: number): IndicatorValue | null => {
    return matrixData.data[year]?.[month] || null;
  };

  const handleStartEdit = (year: number, month: number, value: number) => {
    setEditingCell({ year, month });
    setEditValue(String(value));
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    const numValue = parseFloat(editValue);
    if (isNaN(numValue)) {
      toast.error('Valor inválido');
      return;
    }

    const existingValue = getValueForCell(editingCell.year, editingCell.month);
    
    try {
      if (existingValue) {
        // Update existing
        const { error } = await supabase
          .from('indicator_values')
          .update({ value: numValue })
          .eq('id', existingValue.id);
        if (error) throw error;
      } else {
        // Insert new
        const referenceDate = new Date(editingCell.year, editingCell.month, 1).toISOString().split('T')[0];
        const { error } = await supabase
          .from('indicator_values')
          .insert({
            indicator_id: indicatorId,
            reference_date: referenceDate,
            value: numValue
          });
        if (error) throw error;
      }

      toast.success('Valor salvo');
      setEditingCell(null);
      onValueChange();
    } catch (error) {
      logger.error('Error saving value:', error);
      toast.error('Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;

    try {
      const { error } = await supabase
        .from('indicator_values')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Registro excluído');
      onValueChange();
    } catch (error) {
      logger.error('Error deleting:', error);
      toast.error('Erro ao excluir');
    }
  };

  const formatValue = (val: number): string => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const getVariationColor = (variation: number | null): string => {
    if (variation === null) return 'text-muted-foreground';
    if (variation > 0) return 'text-emerald-400';
    if (variation < 0) return 'text-red-400';
    return 'text-muted-foreground';
  };

  const getVariationIcon = (variation: number | null) => {
    if (variation === null) return <Minus className="h-3 w-3" />;
    if (variation > 0) return <TrendingUp className="h-3 w-3" />;
    if (variation < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  // Calculate date range for display
  const dateRange = useMemo(() => {
    if (values.length === 0) return null;
    const sortedDates = values.map(v => v.reference_date).sort();
    return {
      oldest: sortedDates[0],
      newest: sortedDates[sortedDates.length - 1]
    };
  }, [values]);

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Info banner */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium">
              📊 {matrixData.years.length} anos carregados
            </span>
            {matrixData.years.length > 0 && (
              <span>
                ({matrixData.years[matrixData.years.length - 1]} → {matrixData.years[0]})
              </span>
            )}
          </div>
          {dateRange && (
            <span className="text-xs text-cyan-400/80 font-mono">
              {dateRange.oldest} → {dateRange.newest}
            </span>
          )}
        </div>
        
        <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-bold text-center w-16 sticky left-0 bg-muted/30 z-10">Ano</TableHead>
              {MONTHS.map(month => (
                <TableHead key={month} className="text-center text-xs font-semibold w-20">
                  {month}
                </TableHead>
              ))}
              <TableHead className="text-center font-bold bg-primary/10 text-primary w-24">Média</TableHead>
              <TableHead className="text-center font-bold bg-primary/10 text-primary w-24">Var(%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrixData.years.map(year => {
              const annualAvg = calcAnnualAverage(year);
              const annualVar = calcAnnualVariation(year);

              return (
                <TableRow key={year} className="hover:bg-muted/20">
                  <TableCell className="font-bold text-center sticky left-0 bg-background z-10 border-r border-border/50">
                    {year}
                  </TableCell>
                  
                  {MONTHS.map((_, monthIndex) => {
                    const cellValue = getValueForCell(year, monthIndex);
                    const isEditing = editingCell?.year === year && editingCell?.month === monthIndex;

                    return (
                      <TableCell 
                        key={monthIndex} 
                        className="text-center p-1 group relative"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="any"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 w-16 text-xs text-center p-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                              <Check className="h-3 w-3 text-emerald-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : cellValue ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="cursor-pointer hover:bg-primary/20 rounded px-2 py-1 transition-colors font-mono text-xs"
                                onClick={() => handleStartEdit(year, monthIndex, cellValue.value)}
                              >
                                {formatValue(cellValue.value)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="flex items-center gap-2">
                              <span className="text-xs">{MONTHS[monthIndex]}/{year}</span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(year, monthIndex, cellValue.value);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-5 w-5 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(cellValue.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div 
                            className="cursor-pointer text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/30 rounded px-2 py-1 transition-colors text-xs"
                            onClick={() => handleStartEdit(year, monthIndex, 0)}
                          >
                            --
                          </div>
                        )}
                      </TableCell>
                    );
                  })}

                  {/* Annual Average */}
                  <TableCell className="text-center bg-primary/5 font-semibold">
                    <span className="font-mono text-sm">
                      {annualAvg !== null ? formatValue(annualAvg) : '--'}
                    </span>
                    {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
                  </TableCell>

                  {/* Annual Variation */}
                  <TableCell className="text-center bg-primary/5">
                    <div className={`flex items-center justify-center gap-1 font-semibold ${getVariationColor(annualVar)}`}>
                      {getVariationIcon(annualVar)}
                      <span className="font-mono text-sm">
                        {annualVar !== null ? `${annualVar >= 0 ? '+' : ''}${annualVar.toFixed(1)}%` : '--'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
