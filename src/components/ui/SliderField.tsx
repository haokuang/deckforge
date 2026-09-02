interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
}

export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  className = '',
}: SliderFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="deck-label">{label}</label>
        <span className="text-[11px] text-deck-text2 tabular-nums min-w-[3rem] text-right">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-deck-fill-hover accent-deck-accent
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
        "
        style={{
          backgroundImage: `linear-gradient(to right, var(--color-deck-accent) 0%, var(--color-deck-accent) ${((value - min) / (max - min)) * 100}%, var(--color-deck-fill-hover) ${((value - min) / (max - min)) * 100}%, var(--color-deck-fill-hover) 100%)`,
        }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      />
    </div>
  );
}
