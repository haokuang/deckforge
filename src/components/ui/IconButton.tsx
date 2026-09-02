import type { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  type?: 'button' | 'submit' | 'reset';
}

export function IconButton({
  icon: Icon,
  onClick,
  title,
  active,
  disabled,
  className = '',
  size = 'md',
  type = 'button',
}: IconButtonProps) {
  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center rounded-xl transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
        disabled:opacity-30 disabled:pointer-events-none
        ${size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'}
        ${active
          ? 'bg-deck-accent/15 text-deck-accent border border-deck-accent/35'
          : 'bg-deck-fill text-deck-text2 border border-deck-border hover:bg-deck-fill-hover hover:text-deck-text hover:border-deck-border-hover'
        }
        ${className}
      `}
    >
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
    </button>
  );
}
