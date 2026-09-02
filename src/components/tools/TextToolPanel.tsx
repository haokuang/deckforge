import { useCallback, useMemo } from 'react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type } from 'lucide-react';
import { useStore } from '../../store';
import { FONT_OPTIONS, LINE_HEIGHT_PRESETS } from '../../utils/constants';
import { ChipGroup } from '../ui/ChipGroup';
import { SliderField } from '../ui/SliderField';
import { ColorInput } from '../ui/ColorInput';
import { EmptyState } from '../ui/EmptyState';

const ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐', icon: AlignLeft },
  { value: 'center', label: '居中', icon: AlignCenter },
  { value: 'right', label: '右对齐', icon: AlignRight },
  { value: 'justify', label: '两端对齐', icon: AlignJustify },
];

export function TextToolPanel() {
  const { selectedElement, applyStyle } = useStore();

  const styles = selectedElement?.computedStyles || {};
  const isTextEditable = selectedElement?.isTextEditable ?? false;
  const isBold = styles.fontWeight === '700' || styles.fontWeight === 'bold';
  const isItalic = styles.fontStyle === 'italic';
  const hasUnderline = styles.textDecoration?.includes('underline');
  const hasLineThrough = styles.textDecoration?.includes('line-through');

  const fontSize = useMemo(() => {
    const val = parseInt(styles.fontSize || '16', 10);
    return Number.isNaN(val) ? 16 : val;
  }, [styles.fontSize]);

  const letterSpacing = useMemo(() => {
    const val = parseInt(styles.letterSpacing || '0', 10);
    return Number.isNaN(val) ? 0 : val;
  }, [styles.letterSpacing]);

  const handleStyleChange = useCallback((prop: string, value: string) => {
    applyStyle(prop, value);
  }, [applyStyle]);

  const handleColorChange = useCallback((value: string) => {
    applyStyle('color', value);
  }, [applyStyle]);

  const toggleStyle = useCallback((type: 'bold' | 'italic' | 'underline' | 'lineThrough') => {
    switch (type) {
      case 'bold':
        handleStyleChange('fontWeight', isBold ? '400' : '700');
        break;
      case 'italic':
        handleStyleChange('fontStyle', isItalic ? 'normal' : 'italic');
        break;
      case 'underline':
        if (hasUnderline) {
          handleStyleChange('textDecoration', hasLineThrough ? 'line-through' : 'none');
        } else {
          handleStyleChange('textDecoration', hasLineThrough ? 'underline line-through' : 'underline');
        }
        break;
      case 'lineThrough':
        if (hasLineThrough) {
          handleStyleChange('textDecoration', hasUnderline ? 'underline' : 'none');
        } else {
          handleStyleChange('textDecoration', hasUnderline ? 'underline line-through' : 'line-through');
        }
        break;
    }
  }, [handleStyleChange, isBold, isItalic, hasUnderline, hasLineThrough]);

  if (!selectedElement) {
    return <EmptyState icon={Type} title="未选择元素" description="请先选择一个元素再修改文字样式" />;
  }

  return (
    <div className="space-y-5">
      {/* 颜色对所有选中元素可用 */}
      <ColorInput
        label="文字颜色"
        value={styles.color || '#000000'}
        onChange={handleColorChange}
        allowTransparent={false}
      />

      {!isTextEditable ? (
        <EmptyState
          icon={Type}
          title="不支持文字编辑"
          description="当前元素只能修改颜色，无法直接编辑文字内容"
          className="py-4"
        />
      ) : (
        <>
          <div>
            <label className="deck-label mb-2 block">字体</label>
            <select
              value={styles.fontFamily?.split(',')[0] || 'Inter'}
              onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
              className="deck-input w-full"
            >
              {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <SliderField
            label="字号"
            value={fontSize}
            min={8}
            max={120}
            step={1}
            unit="px"
            onChange={(v) => handleStyleChange('fontSize', `${v}px`)}
          />

          <div>
            <label className="deck-label mb-2 block">对齐</label>
            <ChipGroup
              options={ALIGN_OPTIONS}
              value={styles.textAlign || 'left'}
              onChange={(v) => handleStyleChange('textAlign', v)}
            />
          </div>

          <div>
            <label className="deck-label mb-2 block">行高</label>
            <select
              value={styles.lineHeight || '1.5'}
              onChange={(e) => handleStyleChange('lineHeight', e.target.value)}
              className="deck-input w-full"
            >
              {LINE_HEIGHT_PRESETS.map((lh) => <option key={lh} value={lh}>{lh}</option>)}
            </select>
          </div>

          <SliderField
            label="字间距"
            value={letterSpacing}
            min={-5}
            max={20}
            step={1}
            unit="px"
            onChange={(v) => handleStyleChange('letterSpacing', `${v}px`)}
          />

          <div>
            <label className="deck-label mb-2 block">样式</label>
            <div className="flex gap-1.5">
              {[
                { active: isBold, icon: Bold, label: '粗体', onClick: () => toggleStyle('bold') },
                { active: isItalic, icon: Italic, label: '斜体', onClick: () => toggleStyle('italic') },
                { active: hasUnderline, icon: Underline, label: '下划线', onClick: () => toggleStyle('underline') },
                { active: hasLineThrough, icon: Strikethrough, label: '删除线', onClick: () => toggleStyle('lineThrough') },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    title={item.label}
                    aria-pressed={item.active}
                    onClick={item.onClick}
                    className={`
                      flex-1 h-8 rounded-xl flex items-center justify-center transition-all
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                      ${item.active
                        ? 'bg-deck-accent/15 text-deck-accent border border-deck-accent/40'
                        : 'bg-deck-fill text-deck-text3 border border-deck-border hover:bg-deck-fill-hover hover:text-deck-text'
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
