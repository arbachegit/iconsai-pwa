import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
  Users, 
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { RealIndicators } from "@/hooks/useRealTimeIndicators";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MacroIndicatorsCardProps {
  indicators: RealIndicators;
  isLoading?: boolean;
}

export function MacroIndicatorsCard({ indicators, isLoading }: MacroIndicatorsCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Carregando indicadores...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular frescor dos dados
  const lastUpdate = new Date(indicators.lastUpdated);
  const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
  const isDataFresh = hoursSinceUpdate < 24;

  const formattedDate = formatDistanceToNow(lastUpdate, { 
    addSuffix: true, 
    locale: ptBR 
  });

  const items = [
    {
      icon: Wallet,
      label: "Renda",
      value: `R$ ${indicators.renda.toLocaleString("pt-BR")}`,
      source: indicators.sources.renda,
      color: "text-emerald-500",
    },
    {
      icon: DollarSign,
      label: "Dólar",
      value: `R$ ${indicators.dolar.toFixed(2)}`,
      source: indicators.sources.dolar,
      color: "text-blue-500",
    },
    {
      icon: TrendingUp,
      label: "Selic",
      value: `${indicators.selic.toFixed(2)}%`,
      source: indicators.sources.selic,
      color: "text-amber-500",
    },
    {
      icon: Percent,
      label: "IPCA",
      value: `${indicators.ipca.toFixed(2)}% a.a.`,
      source: indicators.sources.ipca,
      color: "text-red-500",
    },
    {
      icon: Users,
      label: "Desemprego",
      value: `${indicators.desemprego.toFixed(1)}%`,
      source: indicators.sources.desemprego,
      color: "text-purple-500",
    },
  ];

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              📊 Indicadores Atuais
            </Badge>
            <span className="text-xs text-muted-foreground">(fonte: BCB, IBGE)</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isDataFresh ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            <span className={`text-xs ${isDataFresh ? "text-muted-foreground" : "text-amber-500"}`}>
              Atualizado {formattedDate}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-sm text-muted-foreground">{item.label}:</span>
              <span className="text-sm font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
