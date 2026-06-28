import { useCallback, useMemo } from 'react';
import { Image, Upload } from 'lucide-react';
import { useStore } from '../../store';
import { BORDER_RADIUS_PRESETS, SHADOW_PRESETS } from '../../utils/constants';
import { ChipGroup } from '../ui/ChipGroup';
import { NumberInput } from '../ui/NumberInput';
import { SliderField } from '../ui/SliderField';
import { EmptyState } from '../ui/EmptyState';

interface FilterValues {
  brightness: number;
  contrast: number;
  saturate: number;
}

function parseFilter(filter: string): FilterValues {
  const result: FilterValues = { brightness: 100, contrast: 100, saturate: 100 };
  if (!filter) return result;
  const brightness = filter.match(/brightness\((\d+(?:\.\d+)?)%\)/);
  const contrast = filter.match(/contrast\((\d+(?:\.\d+)?)%\)/);
  const saturate = filter.match(/saturate\((\d+(?:\.\d+)?)%\)/);
  if (brightness) result.brightness = Number(brightness[1]);
  if (contrast) result.contrast = Number(contrast[1]);
  if (saturate) result.saturate = Number(saturate[1]);
  return result;
}

function buildFilter(values: FilterValues): string {
  return `brightness(${values.brightness}%) contrast(${values.contrast}%) saturate(${values.saturate}%)`;
}

export function ImageToolPanel() {
  const { selectedElement, applyStyle, replaceImage } = useStore();

  const styles = selectedElement?.computedStyles || {};
  const filters = useMemo(() => parseFilter(styles.filter || ''), [styles.filter]);

  const handleStyleChange = useCallback((prop: string, value: string) => {
    applyStyle(prop, value);
  }, [applyStyle]);

  const handleImageReplace = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target?.result as string; if (url) replaceImage(url); };
    reader.readAsDataURL(file);
  }, [replaceImage]);

  const updateFilter = useCallback((key: keyof FilterValues, value: number) => {
    const next = { ...filters, [key]: value };
    handleStyleChange('filter', buildFilter(next));
  }, [filters, handleStyleChange]);

  if (!selectedElement || !selectedElement.isImage) {
    return <EmptyState icon={Image} title="不是图片" description="当前选中的元素不是图片，无法使用图片工具" />;
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="deck-label mb-2 block">替换图片</label>
        <label className="deck-btn w-full flex items-center justify-center gap-2 cursor-pointer py-2.5">
          <Upload className="w-4 h-4" /><span>上传新图片</span>
          <input type="file" accept="image/*" className="sr-only" onChange={handleImageReplace} />
        </label>
      </div>

      <div className="deck-divider" />

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="宽度"
          value={styles.width || 'auto'}
          onChange={(v) => handleStyleChange('width', v)}
          placeholder="auto"
          units={['px', '%', 'em', 'rem', 'auto']}
        />
        <NumberInput
          label="高度"
          value={styles.height || 'auto'}
          onChange={(v) => handleStyleChange('height', v)}
          placeholder="auto"
          units={['px', '%', 'em', 'rem', 'auto']}
        />
      </div>

      <div>
        <label className="deck-label mb-2 block">圆角</label>
        <ChipGroup
          options={BORDER_RADIUS_PRESETS.map((r) => ({ value: `${r}px`, label: `${r}px` }))}
          value={styles.borderRadius || '0px'}
          onChange={(v) => handleStyleChange('borderRadius', v)}
        />
      </div>

      <div>
        <label className="deck-label mb-2 block">阴影</label>
        <select
          value={styles.boxShadow || 'none'}
          onChange={(e) => handleStyleChange('boxShadow', e.target.value)}
          className="deck-input w-full"
        >
          {SHADOW_PRESETS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        <label className="deck-label block">滤镜</label>
        <SliderField
          label="亮度"
          value={filters.brightness}
          min={0}
          max={200}
          step={1}
          unit="%"
          onChange={(v) => updateFilter('brightness', v)}
        />
        <SliderField
          label="对比度"
          value={filters.contrast}
          min={0}
          max={200}
          step={1}
          unit="%"
          onChange={(v) => updateFilter('contrast', v)}
        />
        <SliderField
          label="饱和度"
          value={filters.saturate}
          min={0}
          max={200}
          step={1}
          unit="%"
          onChange={(v) => updateFilter('saturate', v)}
        />
      </div>
    </div>
  );
}
