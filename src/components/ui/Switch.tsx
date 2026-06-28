import { useCallback, useRef } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, id, disabled, className = '' }: SwitchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const switchId = id || `deck-switch-${Math.random().toString(36).slice(2, 9)}`;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) onChange(!checked);
    }
  }, [checked, disabled, onChange]);

  return (
    <label
      htmlFor={switchId}
      className={`inline-flex items-center gap-2.5 cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        ref={inputRef}
        id={switchId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onClick={() => { if (!disabled) inputRef.current?.click(); }}
        className={`
          relative inline-flex items-center w-11 h-6 rounded-full
          transition-colors duration-300 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
          ${checked ? 'bg-deck-accent' : 'bg-white/10'}
        `}
      >
        <span
          className={`
            inline-block w-4 h-4 rounded-full bg-white shadow-md
            transition-transform duration-300 ease-out
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </span>
      {label && <span className="text-[12px] text-deck-text2 select-none">{label}</span>}
    </label>
  );
}
