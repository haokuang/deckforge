import { useMemo, useRef, useState } from 'react';

const PRESET_COLORS = [
  '#FFFFFF', '#F2F2F7', '#8E8E93', '#48484A',
  '#FF453A', '#FF9F0A', '#FFD60A', '#30D158',
  '#64D2FF', '#0A84FF', '#5E5CE6', '#BF5AF2',
  '#FF375F', '#A2845E', '#AC8E68', '#000000',
];

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allowTransparent?: boolean;
  className?: string;
}

function normalizeHex(value: string): string {
  if (!value || value === 'transparent') return '#ffffff';
  if (value.startsWith('#')) return value.toLowerCase();
  const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    const toHex = (n: string) => Number(n).toString(16).padStart(2, '0');
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`.toLowerCase();
  }
  return '#ffffff';
}

function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(value);
}

export function ColorInput({ value, onChange, label, allowTransparent = true, className = '' }: ColorInputProps) {
  const [isTransparent, setIsTransparent] = useState(value === 'transparent');
  const [hexInput, setHexInput] = useState(normalizeHex(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const normalizedValue = useMemo(() => {
    if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return '#ffffff';
    return normalizeHex(value);
  }, [value]);

  const displayValue = useMemo(() => {
    if (isTransparent || value === 'transparent') return 'transparent';
    return normalizedValue.toUpperCase();
  }, [isTransparent, normalizedValue, value]);

  const handlePresetClick = (color: string) => {
    setIsTransparent(false);
    setHexInput(color.toLowerCase());
    onChange(color);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value.toLowerCase();
    setIsTransparent(false);
    setHexInput(color);
    onChange(color);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setHexInput(input);
    if (isValidHex(input)) {
      setIsTransparent(false);
      onChange(input.toLowerCase());
    }
  };

  const handleTransparentToggle = () => {
    if (isTransparent) {
      setIsTransparent(false);
      setHexInput('#ffffff');
      onChange('#ffffff');
    } else {
      setIsTransparent(true);
      onChange('transparent');
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="deck-label">{label}</label>
          <span className="text-[10px] text-deck-text3 font-mono uppercase">{displayValue}</span>
        </div>
      )}

      <div ref={containerRef} className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((color) => {
          const active = normalizedValue === color.toLowerCase() && !isTransparent;
          return (
            <button
              key={color}
              type="button"
              title={color}
              data-color={color}
              aria-label={`选择颜色 ${color}`}
              onClick={() => handlePresetClick(color)}
              className={`
                w-7 h-7 rounded-lg border-2 transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                ${active ? 'border-deck-accent scale-110 shadow-[0_0_8px_rgba(91,141,239,0.4)]' : 'border-transparent hover:scale-105 hover:border-white/30'}
              `}
              style={{ backgroundColor: color }}
            />
          );
        })}

        {/* 自定义颜色 */}
        <label
          className="
            w-7 h-7 rounded-lg border border-white/10 overflow-hidden cursor-pointer
            flex items-center justify-center transition-all duration-200
            focus-within:ring-2 focus-within:ring-deck-accent/50 focus-within:ring-offset-2 focus-within:ring-offset-black
            hover:border-white/25 hover:bg-white/[0.05] relative
          "
          title="自定义颜色"
        >
          <svg className="w-3.5 h-3.5 text-deck-text2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M13.5 9L7 22l4-1 2.5-5.5L17 17l4 1z"/></svg>
          <input
            ref={nativeInputRef}
            type="color"
            value={normalizedValue}
            onChange={handleColorChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="自定义颜色"
          />
        </label>

        {allowTransparent && (
          <button
            type="button"
            title="透明"
            aria-pressed={isTransparent}
            onClick={handleTransparentToggle}
            className={`
              w-7 h-7 rounded-lg border-2 text-[9px] font-medium transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
              ${isTransparent ? 'border-deck-accent text-deck-accent' : 'border-transparent text-deck-text3 hover:border-white/25'}
            `}
            style={{
              background: isTransparent
                ? 'repeating-conic-gradient(#333 0% 25%, #555 0% 50%) 50% / 8px 8px'
                : 'transparent',
            }}
          >
            透
          </button>
        )}
      </div>

      {/* Hex 输入 */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md border border-white/10 shrink-0"
          style={{ background: isTransparent ? 'repeating-conic-gradient(#333 0% 25%, #555 0% 50%) 50% / 8px 8px' : normalizedValue }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          placeholder="#RRGGBB"
          className="deck-input flex-1 px-2.5 py-1 text-[12px] font-mono uppercase"
          aria-label="颜色 Hex 值"
        />
      </div>
    </div>
  );
}
