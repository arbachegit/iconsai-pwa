import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, Pencil, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IndicatorValue {
  id: string;
  reference_date: string;
  value: number;
}

interface AnnualBlocksViewProps {
  indicatorId: string;
  values: IndicatorValue[];
  unit: string | null;
  onValueChange: () => void;
}

const BLOCK_SIZE = 5;

export default function AnnualBlocksView({ indicatorId, values, unit, onValueChange }: AnnualBlocksViewProps) {
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // Build yearly data and create blocks
  const { yearData, blocks } = useMemo(() => {
    const data: Record<number, IndicatorValue> = {};
    
    values.forEach(v => {
      const year = parseInt(v.reference_date.substring(0, 4));
      data[year] = v;
    });

    const years = Object.keys(data).map(Number).sort((a, b) => b - a);
    
    // Create blocks of 5 years
    const blocksArr: number[][] = [];
    for (let i = 0; i < years.length; i += BLOCK_SIZE) {
      blocksArr.push(years.slice(i, i + BLOCK_SIZE));
    }

    // Add empty block if we have room for more years
    if (years.length > 0) {
      const minYear = Math.min(...years);
      const potentialPrevYears = Array.from({ length: BLOCK_SIZE }, (_, i) => minYear - 1 - i).filter(y => y >= 1990);
      if (potentialPrevYears.length > 0 && (years.length % BLOCK_SIZE === 0 || blocksArr.length === 0)) {
        blocksArr.push(potentialPrevYears);
      }
    }

    return { yearData: data, blocks: blocksArr };
  }, [values]);

  // Calculate variation for a year
  const calcVariation = (year: number): number | null => {
    const currentValue = yearData[year]?.value;
    const previousValue = yearData[year - 1]?.value;

    if (currentValue === undefined || previousValue === undefined || previousValue === 0) return null;
    return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  };

  const handleStartEdit = (year: number, value: number) => {
    setEditingYear(year);
    setEditValue(String(value));
  };

  const handleCancelEdit = () => {
    setEditingYear(null);
    setEditValue('');
  };

  const handleSaveEdit = async (year: number) => {
    const numValue = parseFloat(editValue);
    if (isNaN(numValue)) {
      toast.error('Valor inválido');
      return;
    }

    const existing = yearData[year];
    
    try {
      if (existing) {
        const { error } = await supabase
          .from('indicator_values')
          .update({ value: numValue })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const referenceDate = `${year}-01-01`;
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
      setEditingYear(null);
      onValueChange();
    } catch (error) {
      console.error('Error saving:', error);
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
      console.error('Error deleting:', error);
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

  const getBlockLabel = (block: number[]): string => {
    if (block.length === 0) return '';
    const max = Math.max(...block);
    const min = Math.min(...block);
    return `${max} - ${min}`;
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-6 justify-start">
        {blocks.map((block, blockIndex) => (
          <div 
            key={blockIndex}
            className="bg-muted/20 rounded-lg border border-border/50 overflow-hidden flex-shrink-0"
          >
            {/* Block Header */}
            <div className="px-4 py-2 bg-primary/10 border-b border-border/50">
              <h4 className="text-sm font-semibold text-primary">
                Bloco: {getBlockLabel(block)}
              </h4>
            </div>

            {/* Block Table */}
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-center font-bold w-20">Ano</TableHead>
                  <TableHead className="text-center font-bold w-28">Valor</TableHead>
                  <TableHead className="text-center font-bold w-24">Var(%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {block.map(year => {
                  const data = yearData[year];
                  const variation = calcVariation(year);
                  const isEditing = editingYear === year;

                  return (
                    <TableRow key={year} className="hover:bg-muted/20">
                      <TableCell className="text-center font-bold">{year}</TableCell>
                      
                      <TableCell className="text-center p-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="any"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 w-20 text-xs text-center p-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(year);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEdit(year)}>
                              <Check className="h-3 w-3 text-emerald-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : data ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="cursor-pointer hover:bg-primary/20 rounded px-2 py-1 transition-colors inline-block"
                                onClick={() => handleStartEdit(year, data.value)}
                              >
                                <span className="font-mono text-sm">{formatValue(data.value)}</span>
                                {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="flex items-center gap-2">
                              <span className="text-xs">{year}</span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(year, data.value);
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
                                  handleDelete(data.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div 
                            className="cursor-pointer text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/30 rounded px-2 py-1 transition-colors text-sm inline-block"
                            onClick={() => handleStartEdit(year, 0)}
                          >
                            --
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className={`flex items-center justify-center gap-1 ${getVariationColor(variation)}`}>
                          {getVariationIcon(variation)}
                          <span className="font-mono text-sm">
                            {variation !== null ? `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%` : '--'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
