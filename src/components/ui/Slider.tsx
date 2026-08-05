import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

type SliderProps = {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
};

export function Slider({ value, onValueChange, min = 0, max = 100, step = 1, className, disabled }: SliderProps) {
  const [internal, setInternal] = useState(value[0] ?? min);
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInternal(value[0] ?? min);
  }, [value, min]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value);
    setInternal(next);
    onValueChange([next]);
  }

  const percent = ((internal - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex h-5 w-full items-center", className)}>
      <div className="relative h-2 w-full rounded-full bg-muted">
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={internal}
        onChange={handleChange}
        disabled={disabled}
        className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background"
      />
    </div>
  );
}
