import { LucideIcon, TrendingUp, DollarSign, Percent, Users, BarChart3, ShoppingCart, Heart, Building2, Car, Fuel, Pill, Tv, Shirt, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date-utils';

interface Indicator {
  id: string;
  name: string;
  code: string;
  frequency: string;
  unit: string | null;
  category?: string;
  api_id?: string | null;
}

interface IndicatorCardProps {
  indicator: Indicator;
  recordCount: number;
  lastUpdate: string | null;
  source: string;
  onClick: () => void;
}

// Icon mapping based on indicator code/name
const getIndicatorIcon = (code: string, name: string): LucideIcon => {
  const lowerCode = code.toLowerCase();
  const lowerName = name.toLowerCase();
  
  if (lowerCode.includes('selic') || lowerCode.includes('cdi')) return TrendingUp;
  if (lowerCode.includes('dolar') || lowerCode.includes('ptax')) return DollarSign;
  if (lowerCode.includes('ipca')) return Percent;
  if (lowerCode.includes('pib')) return BarChart3;
  if (lowerCode.includes('desemp') || lowerName.includes('desemprego')) return Users;
  if (lowerName.includes('confiança') || lowerName.includes('consumidor')) return Heart;
  if (lowerName.includes('vestuário') || lowerName.includes('roupa')) return Shirt;
  if (lowerName.includes('móveis') || lowerName.includes('eletro')) return Tv;
  if (lowerName.includes('farmácia') || lowerName.includes('farma')) return Pill;
  if (lowerName.includes('combustível') || lowerName.includes('combustíveis')) return Fuel;
  if (lowerName.includes('veículo') || lowerName.includes('veículos')) return Car;
  if (lowerName.includes('construção') || lowerName.includes('material')) return Building2;
  if (lowerName.includes('varejo')) return ShoppingCart;
  
  return Activity;
};

// Frequency label mapping
const getFrequencyLabel = (frequency: string): string => {
  const freq = frequency?.toLowerCase() || 'monthly';
  if (freq === 'daily' || freq === 'diária') return 'Diária';
  if (freq === 'weekly' || freq === 'semanal') return 'Semanal';
  if (freq === 'monthly' || freq === 'mensal') return 'Mensal';
  if (freq === 'quarterly' || freq === 'trimestral') return 'Trimestral';
  if (freq === 'yearly' || freq === 'anual') return 'Anual';
  return frequency || 'Mensal';
};

// Category color mapping
const getCategoryColors = (category?: string) => {
  switch (category) {
    case 'varejo_restrito':
      return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', iconBg: 'bg-emerald-500/30', text: 'text-emerald-400' };
    case 'varejo_ampliado':
      return { bg: 'bg-purple-500/20', border: 'border-purple-500/40', iconBg: 'bg-purple-500/30', text: 'text-purple-400' };
    default:
      return { bg: 'bg-primary/10', border: 'border-primary/30', iconBg: 'bg-primary/20', text: 'text-primary' };
  }
};

export default function IndicatorCard({ indicator, recordCount, lastUpdate, source, onClick }: IndicatorCardProps) {
  const Icon = getIndicatorIcon(indicator.code, indicator.name);
  const colors = getCategoryColors(indicator.category);
  const frequencyLabel = getFrequencyLabel(indicator.frequency);
  
  const formattedLastUpdate = lastUpdate ? formatDate(lastUpdate) : '--';

  return (
    <Card 
      onClick={onClick}
      className={`
        cursor-pointer group relative overflow-hidden
        ${colors.bg} ${colors.border}
        transition-all duration-300 ease-out
        hover:scale-105 hover:shadow-lg hover:shadow-primary/20
        hover:border-primary hover:-translate-y-1
        active:scale-[1.02]
      `}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      </div>
      
      <CardContent className="p-5 relative z-10">
        <div className="flex items-start justify-between gap-3">
          {/* Icon */}
          <div className={`
            h-12 w-12 rounded-xl ${colors.iconBg} 
            flex items-center justify-center shrink-0
            transition-transform duration-300 group-hover:scale-110
          `}>
            <Icon className={`h-6 w-6 ${colors.text}`} />
          </div>
          
          {/* Record count badge */}
          <Badge 
            variant="secondary" 
            className="text-xs font-mono bg-muted/50 text-muted-foreground"
          >
            {recordCount} reg
          </Badge>
        </div>
        
        {/* Title */}
        <h3 className="mt-4 font-semibold text-foreground leading-tight line-clamp-2 min-h-[2.5rem]">
          {indicator.name}
        </h3>
        
        {/* Metadata badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge 
            variant="outline" 
            className="text-xs bg-card/50 border-border/50"
          >
            {source}
          </Badge>
          <Badge 
            variant="outline" 
            className="text-xs bg-card/50 border-border/50"
          >
            {frequencyLabel}
          </Badge>
          {indicator.unit && (
            <Badge 
              variant="outline" 
              className="text-xs bg-card/50 border-border/50"
            >
              {indicator.unit}
            </Badge>
          )}
        </div>
        
        {/* Last update */}
        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            Atualizado em: <span className="font-medium text-foreground/80">{formattedLastUpdate}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
