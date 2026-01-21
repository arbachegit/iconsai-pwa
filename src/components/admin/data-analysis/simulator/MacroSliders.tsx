import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface Sliders2026 {
  renda: number;
  dolar: number;
  selic: number;
  ipca: number;
  desemprego: number;
}

interface MacroSlidersProps {
  values: Sliders2026;
  onChange: (values: Sliders2026) => void;
  disabled?: boolean;
}

const SLIDER_CONFIG = [
  { key: "renda", label: "Renda Per Capita", min: 1500, max: 2500, step: 50, unit: "R$", format: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
  { key: "dolar", label: "Dólar", min: 4.5, max: 7.0, step: 0.1, unit: "R$", format: (v: number) => `R$ ${v.toFixed(2)}` },
  { key: "selic", label: "Taxa Selic", min: 8, max: 16, step: 0.5, unit: "%", format: (v: number) => `${v.toFixed(1)}%` },
  { key: "ipca", label: "IPCA", min: 2, max: 8, step: 0.25, unit: "%", format: (v: number) => `${v.toFixed(2)}%` },
  { key: "desemprego", label: "Desemprego", min: 5, max: 12, step: 0.5, unit: "%", format: (v: number) => `${v.toFixed(1)}%` },
];

export function MacroSliders({ values, onChange, disabled }: MacroSlidersProps) {
  const handleChange = (key: string, newValue: number[]) => {
    onChange({
      ...values,
      [key]: newValue[0],
    });
  };

  return (
    <div className="space-y-5">
      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        Variáveis Macroeconômicas
      </h4>
      
      {SLIDER_CONFIG.map(config => (
        <div key={config.key} className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm">{config.label}</Label>
            <span className="text-sm font-mono font-medium text-primary">
              {config.format(values[config.key as keyof Sliders2026])}
            </span>
          </div>
          <Slider
            value={[values[config.key as keyof Sliders2026]]}
            onValueChange={(v) => handleChange(config.key, v)}
            min={config.min}
            max={config.max}
            step={config.step}
            disabled={disabled}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{config.format(config.min)}</span>
            <span>{config.format(config.max)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
