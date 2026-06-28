import type { LucideIcon } from 'lucide-react';

interface ChipOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  title?: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  value: string | string[];
  onChange: (value: string) => void;
  multiple?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ChipGroup({ options, value, onChange, multiple, size = 'sm', className = '' }: ChipGroupProps) {
  const isSelected = (v: string) => (multiple ? (value as string[]).includes(v) : value === v);

  return (
    <div
      className={`flex flex-wrap gap-1.5 ${className}`}
      role={multiple ? 'group' : 'radiogroup'}
      aria-label="选项组"
    >
      {options.map((option) => {
        const selected = isSelected(option.value);
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={selected}
            title={option.title || option.label}
            onClick={() => onChange(option.value)}
            className={`
              inline-flex items-center justify-center gap-1 transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
              ${size === 'sm' ? 'px-2 py-1 text-[11px] rounded-lg' : 'px-2.5 py-1.5 text-[12px] rounded-xl'}
              ${selected
                ? 'bg-deck-accent/15 text-deck-accent border border-deck-accent/40'
                : 'bg-white/[0.05] text-deck-text2 border border-white/[0.08] hover:bg-white/[0.09] hover:text-deck-text hover:border-white/[0.12]'
              }
            `}
          >
            {Icon && <Icon className="w-3 h-3" />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
