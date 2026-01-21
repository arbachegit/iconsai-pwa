import * as React from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
}

export function DebouncedInput({
  value,
  onChange,
  delay = 300,
  className,
  ...props
}: DebouncedInputProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const debouncedValue = useDebounce(localValue, delay);

  // Sync external value changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Emit debounced value
  React.useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);

  return (
    <Input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      className={cn(className)}
      {...props}
    />
  );
}
