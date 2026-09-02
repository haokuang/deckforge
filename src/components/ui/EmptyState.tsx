import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-8 px-4 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-deck-fill border border-deck-border flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-deck-text2" />
      </div>
      <h4 className="text-[13px] font-medium text-deck-text mb-1">{title}</h4>
      {description && <p className="text-[11px] text-deck-text3 leading-relaxed max-w-[200px]">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 px-3 py-1.5 rounded-xl text-[12px] font-medium bg-deck-fill text-deck-text2 border border-deck-border hover:bg-deck-fill-hover hover:text-deck-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
