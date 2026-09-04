/** 全局常量定义 */

import type { FontOption, ColorPreset } from '../types';

/** 字体选项（stack：中英文都能命中的跨平台字体栈） */
export const FONT_OPTIONS: FontOption[] = [
  { value: 'Inter', label: 'Inter', category: 'sans', stack: "Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { value: 'SF Pro Display', label: 'SF Pro', category: 'sans', stack: "'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { value: 'PingFang SC', label: '苹方', category: 'sans', stack: "'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { value: 'Microsoft YaHei', label: '微软雅黑', category: 'sans', stack: "'Microsoft YaHei', 'PingFang SC', sans-serif" },
  { value: 'Noto Sans SC', label: '思源黑体', category: 'sans', stack: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { value: 'Songti SC', label: '宋体', category: 'serif', stack: "'Songti SC', SimSun, serif" },
  { value: 'Kaiti SC', label: '楷体', category: 'serif', stack: "'Kaiti SC', STKaiti, KaiTi, serif" },
  { value: 'FangSong', label: '仿宋', category: 'serif', stack: "'FangSong', 'Songti SC', serif" },
  { value: 'Arial', label: 'Arial', category: 'sans', stack: "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { value: 'Georgia', label: 'Georgia', category: 'serif', stack: "Georgia, 'Songti SC', SimSun, serif" },
  { value: 'Courier New', label: 'Courier New', category: 'mono', stack: "'Courier New', 'PingFang SC', monospace" },
  { value: 'Impact', label: 'Impact', category: 'display', stack: "Impact, 'PingFang SC', sans-serif" },
];

/** 文字颜色预设 */
export const TEXT_COLOR_PRESETS: ColorPreset[] = [
  { name: '黑色', value: '#000000' },
  { name: '深灰', value: '#333333' },
  { name: '中灰', value: '#666666' },
  { name: '浅灰', value: '#999999' },
  { name: '白色', value: '#ffffff' },
  { name: '红色', value: '#ef4444' },
  { name: '橙色', value: '#f97316' },
  { name: '琥珀', value: '#f59e0b' },
  { name: '绿色', value: '#22c55e' },
  { name: '翠绿', value: '#10b981' },
  { name: '青色', value: '#06b6d4' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '靛蓝', value: '#6366f1' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '品红', value: '#d946ef' },
  { name: '粉色', value: '#ec4899' },
];

/** 背景颜色预设 */
export const BG_COLOR_PRESETS: ColorPreset[] = [
  { name: '透明', value: 'transparent' },
  { name: '白色', value: '#ffffff' },
  { name: '浅灰', value: '#f3f4f6' },
  { name: '深灰', value: '#1f2937' },
  { name: '黑色', value: '#000000' },
  { name: '红色', value: '#fef2f2' },
  { name: '橙色', value: '#fff7ed' },
  { name: '黄色', value: '#fefce8' },
  { name: '绿色', value: '#f0fdf4' },
  { name: '蓝色', value: '#eff6ff' },
  { name: '紫色', value: '#faf5ff' },
  { name: '粉色', value: '#fdf2f8' },
];

/** 字号预设（px） */
export const FONT_SIZE_PRESETS = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120];

/** 字重预设 */
export const FONT_WEIGHT_PRESETS = [
  { value: '100', label: 'Thin' },
  { value: '200', label: 'Extra Light' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
  { value: '900', label: 'Black' },
];

/** 行高预设 */
export const LINE_HEIGHT_PRESETS = [0.5, 0.8, 1, 1.2, 1.4, 1.5, 1.6, 1.8, 2, 2.5, 3];

/** 字间距预设（px） */
export const LETTER_SPACING_PRESETS = [-5, -3, -2, -1, 0, 1, 2, 3, 5, 8, 10, 15, 20];

/** 圆角预设（px） */
export const BORDER_RADIUS_PRESETS = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 50];

/** 阴影预设 */
export const SHADOW_PRESETS = [
  { value: 'none', label: '无' },
  { value: '0 1px 3px rgba(0,0,0,0.1)', label: '轻微' },
  { value: '0 4px 6px rgba(0,0,0,0.1)', label: '柔和' },
  { value: '0 10px 15px rgba(0,0,0,0.1)', label: '中等' },
  { value: '0 20px 25px rgba(0,0,0,0.15)', label: '强烈' },
  { value: '0 25px 50px rgba(0,0,0,0.25)', label: '投影' },
];

/** Slide 识别选择器 */
export const SLIDE_SELECTORS = [
  '.slide', '.page', '.section', '.chapter',
  '[data-slide]', '[data-page]', '[data-section]',
  '.reveal .slides section', '.impress-step',
  '.swiper-slide', '.carousel-item',
  'section', 'article',
];

/** 格式刷可复制样式属性白名单 */
export const FORMAT_PAINTER_PROPERTIES = [
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
  'color', 'textAlign', 'textDecoration', 'fontStyle',
  'backgroundColor', 'borderRadius', 'boxShadow', 'opacity',
];

/** 应用名称和版本 */
export const APP_NAME = 'DeckForge';
export const APP_NAME_CN = '演示工坊';
export const APP_VERSION = '1.0.0';
