import { useCallback, useMemo, useState } from 'react';
import { Layers, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MoveVertical } from 'lucide-react';
import { useStore } from '../../store';
import { Switch } from '../ui/Switch';
import { NumberInput } from '../ui/NumberInput';
import { SliderField } from '../ui/SliderField';
import { ColorInput } from '../ui/ColorInput';
import { EmptyState } from '../ui/EmptyState';
import { IconButton } from '../ui/IconButton';

export function LayoutToolPanel() {
  const { selectedElement, applyStyle } = useStore();
  const [step, setStep] = useState<1 | 10>(1);

  const styles = selectedElement?.computedStyles || {};

  const opacity = useMemo(() => {
    const val = parseFloat(styles.opacity || '1');
    return Number.isNaN(val) ? 100 : Math.round(val * 100);
  }, [styles.opacity]);

  const zIndex = useMemo(() => {
    const val = parseInt(styles.zIndex || '0', 10);
    return Number.isNaN(val) ? 0 : val;
  }, [styles.zIndex]);

  const handleStyleChange = useCallback((prop: string, value: string) => {
    applyStyle(prop, value);
  }, [applyStyle]);

  const move = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    const amt = step;
    const t = parseInt(styles.top || '0', 10) || 0;
    const l = parseInt(styles.left || '0', 10) || 0;
    if (dir === 'up') handleStyleChange('top', `${t - amt}px`);
    if (dir === 'down') handleStyleChange('top', `${t + amt}px`);
    if (dir === 'left') handleStyleChange('left', `${l - amt}px`);
    if (dir === 'right') handleStyleChange('left', `${l + amt}px`);
  }, [handleStyleChange, step, styles.top, styles.left]);

  if (!selectedElement) {
    return <EmptyState icon={Layers} title="未选择元素" description="请先选择一个元素再调整布局" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-deck-text">显示元素</span>
        <Switch
          checked={styles.display !== 'none'}
          onChange={(checked) => handleStyleChange('display', checked ? 'block' : 'none')}
        />
      </div>

      <div className="deck-divider" />

      <div>
        <label className="deck-label mb-2 block">层级 (z-index)</label>
        <div className="flex gap-2">
          <NumberInput
            value={String(zIndex)}
            onChange={(v) => handleStyleChange('zIndex', v)}
            className="flex-1"
          />
          <div className="flex gap-1">
            <IconButton icon={MoveVertical} title="层级 +1" onClick={() => handleStyleChange('zIndex', String(zIndex + 1))} size="sm" />
            <IconButton icon={MoveVertical} title="层级 -1" onClick={() => handleStyleChange('zIndex', String(zIndex - 1))} size="sm" />
          </div>
        </div>
      </div>

      <div>
        <label className="deck-label mb-2 block">位置微调</label>
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-3 gap-1.5">
            <div />
            <IconButton icon={ArrowUp} title="上移" onClick={() => move('up')} size="sm" />
            <div />
            <IconButton icon={ArrowLeft} title="左移" onClick={() => move('left')} size="sm" />
            <div className="flex items-center justify-center">
              <span className="text-[10px] text-deck-text3">{step}px</span>
            </div>
            <IconButton icon={ArrowRight} title="右移" onClick={() => move('right')} size="sm" />
            <div />
            <IconButton icon={ArrowDown} title="下移" onClick={() => move('down')} size="sm" />
            <div />
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`px-2 py-1 rounded-lg text-[10px] transition-colors ${step === 1 ? 'bg-deck-accent/20 text-deck-accent' : 'bg-white/[0.05] text-deck-text3 hover:bg-white/[0.08]'}`}
            >
              1px
            </button>
            <button
              type="button"
              onClick={() => setStep(10)}
              className={`px-2 py-1 rounded-lg text-[10px] transition-colors ${step === 10 ? 'bg-deck-accent/20 text-deck-accent' : 'bg-white/[0.05] text-deck-text3 hover:bg-white/[0.08]'}`}
            >
              10px
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="内边距"
          value={styles.padding || '0'}
          onChange={(v) => handleStyleChange('padding', v)}
          placeholder="10px"
        />
        <NumberInput
          label="外边距"
          value={styles.margin || '0'}
          onChange={(v) => handleStyleChange('margin', v)}
          placeholder="10px"
        />
      </div>

      <ColorInput
        label="背景色"
        value={styles.backgroundColor || 'transparent'}
        onChange={(v) => handleStyleChange('backgroundColor', v)}
      />

      <SliderField
        label="透明度"
        value={opacity}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => handleStyleChange('opacity', String(v / 100))}
      />
    </div>
  );
}
