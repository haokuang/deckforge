import { useCallback, useMemo } from 'react';

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  units?: string[];
  unit?: string;
  onUnitChange?: (unit: string) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  label,
  placeholder = 'auto',
  units,
  unit,
  onUnitChange,
  min,
  max,
  step: _step = 1,
  className = '',
}: NumberInputProps) {
  const { numericPart, unitPart } = useMemo(() => {
    const match = value?.match(/^(-?\d*\.?\d*)(.*)$/);
    return {
      numericPart: match ? match[1] : '',
      unitPart: match ? match[2] : (unit || ''),
    };
  }, [value, unit]);

  const handleNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      onChange(raw + unitPart);
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    if (min !== undefined && num < min) return;
    if (max !== undefined && num > max) return;
    onChange(raw + unitPart);
  }, [min, max, onChange, unitPart]);

  const handleUnitChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value;
    if (onUnitChange) {
      onUnitChange(newUnit);
    } else {
      onChange((numericPart || '0') + newUnit);
    }
  }, [numericPart, onChange, onUnitChange]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="deck-label">{label}</label>}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          value={numericPart}
          placeholder={placeholder}
          onChange={handleNumberChange}
          className="deck-input flex-1 min-w-0 px-3 py-1.5 text-[13px]"
        />
        {units && units.length > 0 && (
          <select
            value={unitPart || unit}
            onChange={handleUnitChange}
            className="deck-input w-16 px-2 py-1.5 text-[12px]"
            aria-label="单位"
          >
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
        {unit && !units && (
          <span className="text-[12px] text-deck-text3 w-8">{unit}</span>
        )}
      </div>
    </div>
  );
}
