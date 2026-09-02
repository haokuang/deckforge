import { useId } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, id, disabled, className = '' }: SwitchProps) {
  const generatedId = useId();
  const switchId = id || `deck-switch-${generatedId}`;

  return (
    <label
      htmlFor={switchId}
      className={`inline-flex items-center gap-2.5 cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        id={switchId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <span
        aria-hidden="true"
        className={`
          relative inline-flex items-center w-11 h-6 rounded-full
          transition-colors duration-300 ease-out
          peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-deck-accent/50
          ${checked ? 'bg-deck-accent' : 'bg-deck-border-hover'}
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
