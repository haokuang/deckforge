/**
 * DOM 操作工具函数
 */

/**
 * 为元素生成唯一 CSS 选择器
 */
export function generateSelector(el: HTMLElement, root: HTMLElement = document.body): string {
  if (!el || el === root) return '';

  if (el.id) return `#${el.id}`;

  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList)
    .filter((c) => !c.startsWith('deckforge-'))
    .join('.');

  const parent = el.parentElement;
  if (!parent || parent === root) {
    return classes ? `${tag}.${classes}` : tag;
  }

  const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
  const index = siblings.indexOf(el) + 1;
  const selector = classes
    ? `${tag}.${classes}:nth-of-type(${index})`
    : `${tag}:nth-of-type(${index})`;

  return selector;
}

/**
 * 从选择器查找元素
 */
export function findElementBySelector(selector: string, doc: Document = document): HTMLElement | null {
  try {
    return doc.querySelector(selector) as HTMLElement;
  } catch {
    return null;
  }
}

/**
 * 获取元素的计算样式映射
 */
export function getComputedStyleMap(el: HTMLElement): Record<string, string> {
  const computed = window.getComputedStyle(el);
  return {
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    lineHeight: computed.lineHeight,
    letterSpacing: computed.letterSpacing,
    color: computed.color,
    textAlign: computed.textAlign,
    backgroundColor: computed.backgroundColor,
    borderRadius: computed.borderRadius,
    width: computed.width,
    height: computed.height,
    display: computed.display,
    position: computed.position,
    zIndex: computed.zIndex,
    padding: computed.padding,
    margin: computed.margin,
    opacity: computed.opacity,
    boxShadow: computed.boxShadow,
    textDecoration: computed.textDecoration,
    fontStyle: computed.fontStyle,
  };
}

/**
 * 判断元素是否为文本可编辑
 */
export function isTextEditable(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  const editableTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'a', 'li', 'td', 'th', 'label', 'strong', 'em', 'b', 'i', 'small'];
  return editableTags.includes(tag) && !el.querySelector('img, svg, canvas, video, iframe');
}

/**
 * 判断元素是否为图片
 */
export function isImageElement(el: HTMLElement): boolean {
  return el.tagName.toLowerCase() === 'img' || el.tagName.toLowerCase() === 'svg';
}

/**
 * 为 iframe 注入编辑桥接脚本
 */
export function injectEditorBridge(iframe: HTMLIFrameElement): void {
  if (!iframe.contentWindow || !iframe.contentDocument) return;

  const script = iframe.contentDocument.createElement('script');
  script.textContent = `
    (function() {
      if (window.__deckforgeBridgeLoaded) return;
      window.__deckforgeBridgeLoaded = true;

      let selectedElement = null;
      let isEditMode = false;
      let allSlides = [];
      let currentSlideIndex = 0;
      let originalDisplayStyles = new Map();

      // 通用 Slide 选择器（在未检测到知名库时使用）
      const GENERIC_SELECTORS = [
        '.slide', '.page', '.chapter',
        '[data-slide]', '[data-page]', '[data-section]',
        '.swiper-slide', '.carousel-item',
      ];

      function getOriginalDisplay(el) {
        if (!originalDisplayStyles.has(el)) {
          const display = readEffectiveDisplay(el);
          originalDisplayStyles.set(el, display);
        }
        return originalDisplayStyles.get(el);
      }

      function readEffectiveDisplay(el) {
        // 先尝试读取当前计算样式（若元素已可见）
        const cs = window.getComputedStyle(el);
        if (cs.display && cs.display !== 'none') return cs.display;

        // 元素当前不可见，临时解禁并读取真实 display，避免把 none 当作原始值
        const prevDisplay = el.style.display;
        const prevVisibility = el.style.visibility;
        const prevOpacity = el.style.opacity;
        const prevPosition = el.style.position;
        el.style.display = '';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.style.position = 'absolute';
        const effective = window.getComputedStyle(el).display || 'block';
        el.style.display = prevDisplay;
        el.style.visibility = prevVisibility;
        el.style.opacity = prevOpacity;
        el.style.position = prevPosition;
        return effective;
      }

      function inferDisplayType(el) {
        // 优先从匹配的 CSS 规则读取 display
        const fromCss = readDisplayFromCssRules(el);
        if (fromCss) return fromCss;

        // 根据标签推断一个合理的 display 值
        const tag = el.tagName.toLowerCase();
        if (tag === 'li') return 'list-item';
        if (tag === 'table') return 'table';
        if (tag === 'tr') return 'table-row';
        if (tag === 'td' || tag === 'th') return 'table-cell';
        if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot') return 'table-row-group';
        if (tag === 'colgroup') return 'table-column-group';
        if (tag === 'col') return 'table-column';
        if (tag === 'form' || tag === 'fieldset' || tag === 'figcaption' || tag === 'figure' || tag === 'footer' || tag === 'header' || tag === 'main' || tag === 'nav' || tag === 'section' || tag === 'article' || tag === 'aside' || tag === 'details' || tag === 'summary' || tag === 'p' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' || tag === 'blockquote' || tag === 'pre' || tag === 'address') return 'block';
        if (tag === 'span' || tag === 'a' || tag === 'em' || tag === 'strong' || tag === 'b' || tag === 'i' || tag === 'small' || tag === 'sub' || tag === 'sup' || tag === 'label' || tag === 'abbr' || tag === 'cite' || tag === 'code' || tag === 'kbd' || tag === 'samp' || tag === 'var') return 'inline';
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || tag === 'img' || tag === 'svg' || tag === 'canvas' || tag === 'video' || tag === 'audio' || tag === 'iframe') return 'inline-block';
        return 'block';
      }

      function readDisplayFromCssRules(el) {
        try {
          const sheets = Array.from(document.styleSheets);
          for (const sheet of sheets) {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            for (const rule of rules) {
              if (rule.selectorText && typeof rule.selectorText === 'string') {
                const selectors = rule.selectorText.split(',');
                for (const sel of selectors) {
                  if (el.matches(sel.trim())) {
                    const display = rule.style.display;
                    if (display && display !== 'none') return display;
                  }
                }
              }
            }
          }
        } catch (e) {}
        return null;
      }

      function clearHighlight() {
        if (selectedElement) {
          selectedElement.style.outline = '';
          selectedElement.style.outlineOffset = '';
          selectedElement = null;
        }
      }

      function detectPresentationLibrary() {
        if (typeof window.Reveal !== 'undefined' && window.Reveal) return 'reveal';
        if (typeof window.impress !== 'undefined' && window.impress) return 'impress';
        if (typeof window.fullpage_api !== 'undefined' && window.fullpage_api) return 'fullpage';
        const swiperEl = document.querySelector('.swiper');
        if (swiperEl && typeof window.Swiper !== 'undefined' && window.Swiper) return 'swiper';
        return 'native';
      }

      function findAllSlides() {
        allSlides = [];

        // 1. reveal.js（已初始化 API）
        if (typeof window.Reveal !== 'undefined' && window.Reveal && window.Reveal.getSlides) {
          try {
            const slides = window.Reveal.getSlides();
            if (slides && slides.length > 1) {
              allSlides = Array.from(slides);
              allSlides.forEach(getOriginalDisplay);
              return true;
            }
          } catch (e) {}
        }

        // 2. reveal.js（未初始化 API，仅 DOM 结构）
        try {
          const revealSlides = document.querySelectorAll('.reveal .slides > section');
          if (revealSlides.length > 1) {
            allSlides = Array.from(revealSlides);
            allSlides.forEach(getOriginalDisplay);
            return true;
          }
        } catch (e) {}

        // 3. impress.js
        if (typeof window.impress !== 'undefined' && window.impress) {
          try {
            const steps = document.querySelectorAll('.step');
            if (steps.length > 1) {
              allSlides = Array.from(steps);
              allSlides.forEach(getOriginalDisplay);
              return true;
            }
          } catch (e) {}
        }

        // 4. fullpage.js
        if (typeof window.fullpage_api !== 'undefined' && window.fullpage_api) {
          try {
            const sections = document.querySelectorAll('.section');
            if (sections.length > 1) {
              allSlides = Array.from(sections);
              allSlides.forEach(getOriginalDisplay);
              return true;
            }
          } catch (e) {}
        }

        // 5. swiper
        if (typeof window.Swiper !== 'undefined' && window.Swiper) {
          try {
            const swiperSlides = document.querySelectorAll('.swiper-slide');
            if (swiperSlides.length > 1) {
              allSlides = Array.from(swiperSlides);
              allSlides.forEach(getOriginalDisplay);
              return true;
            }
          } catch (e) {}
        }

        // 6. 通用选择器
        for (const sel of GENERIC_SELECTORS) {
          try {
            const els = document.querySelectorAll(sel);
            if (els.length > 1) {
              allSlides = Array.from(els);
              allSlides.forEach(getOriginalDisplay);
              return true;
            }
          } catch (e) {}
        }

        // 兜底：把整个 body 当作一页
        allSlides = [document.body];
        return true;
      }

      function showSlide(index) {
        if (allSlides.length === 0) findAllSlides();
        if (allSlides.length <= 1) return;

        index = Math.max(0, Math.min(index, allSlides.length - 1));
        currentSlideIndex = index;

        // 切换页面时清除当前选中高亮，避免残留 outline 留在不可见页
        clearHighlight();

        const target = allSlides[index];
        const lib = detectPresentationLibrary();

        // 优先使用知名 PPT/幻灯片库的 API，避免直接覆盖 display 破坏动画/过渡
        if (lib === 'reveal' && typeof window.Reveal.slide === 'function') {
          try {
            window.Reveal.slide(target);
            return;
          } catch (e) {}
        }

        if (lib === 'impress') {
          try {
            window.impress().goto(target);
            return;
          } catch (e) {}
        }

        if (lib === 'fullpage' && typeof window.fullpage_api.moveTo === 'function') {
          try {
            window.fullpage_api.moveTo(index + 1);
            return;
          } catch (e) {}
        }

        if (lib === 'swiper') {
          try {
            const swiperContainer = document.querySelector('.swiper');
            if (swiperContainer && swiperContainer.swiper && typeof swiperContainer.swiper.slideTo === 'function') {
              swiperContainer.swiper.slideTo(index);
              return;
            }
          } catch (e) {}
        }

        // 原生降级：识别并尊重页面自身的幻灯片显示约定
        // 常见的类驱动显示：.active / .current / .visible / .show / .selected
        const activeClass = detectActiveClassPattern();

        if (activeClass) {
          // 类驱动切换（如 SmartHybridDetectorV3_Defense.html 的 .active）
          allSlides.forEach((el, i) => {
            if (i === index) {
              el.classList.add(activeClass);
              // 清除可能由旧逻辑留下的内联 display，让 CSS 类生效
              el.style.display = '';
            } else {
              el.classList.remove(activeClass);
              el.style.display = '';
            }
          });
        } else {
          // display 驱动切换
          allSlides.forEach((el, i) => {
            if (i === index) {
              const original = getOriginalDisplay(el);
              if (!original || original === 'none') {
                el.style.display = inferDisplayType(el);
              } else {
                el.style.display = original;
              }
            } else {
              el.style.display = 'none';
            }
          });
        }

        // 确保 body 本身可见，但尽量不破坏原有 display 类型
        if (allSlides[0] !== document.body) {
          const bodyDisplay = window.getComputedStyle(document.body).display;
          if (bodyDisplay === 'none') {
            document.body.style.display = 'block';
          }
        }
        // 强制重排以确保样式变更生效
        document.body.offsetHeight;
      }

      function detectActiveClassPattern() {
        if (allSlides.length < 2) return null;
        const candidates = ['active', 'current', 'visible', 'show', 'selected'];
        for (const cls of candidates) {
          const count = allSlides.filter(el => el.classList.contains(cls)).length;
          // 有且仅有部分 slide 拥有该 class，才认为是激活标记
          if (count > 0 && count < allSlides.length) return cls;
        }
        return null;
      }

      function generateSelector(el) {
        if (!el) return '';
        if (el.id) return '#' + el.id;
        const tag = el.tagName.toLowerCase();
        const classes = Array.from(el.classList).filter(c => !c.startsWith('deckforge-')).join('.');
        const parent = el.parentElement;
        if (!parent) return classes ? tag + '.' + classes : tag;
        const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
        const index = siblings.indexOf(el) + 1;
        return classes ? tag + '.' + classes + ':nth-of-type(' + index + ')' : tag + ':nth-of-type(' + index + ')';
      }

      function getComputedStyleMap(el) {
        const cs = window.getComputedStyle(el);
        return {
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          color: cs.color,
          textAlign: cs.textAlign,
          backgroundColor: cs.backgroundColor,
          borderRadius: cs.borderRadius,
          width: cs.width,
          height: cs.height,
          display: cs.display,
          position: cs.position,
          zIndex: cs.zIndex,
          padding: cs.padding,
          margin: cs.margin,
          opacity: cs.opacity,
          boxShadow: cs.boxShadow,
          textDecoration: cs.textDecoration,
          fontStyle: cs.fontStyle,
        };
      }

      function isTextEditable(el) {
        const tag = el.tagName.toLowerCase();
        const editableTags = ['p','h1','h2','h3','h4','h5','h6','span','div','a','li','td','th','label','strong','em','b','i','small'];
        return editableTags.includes(tag) && !el.querySelector('img, svg, canvas, video, iframe');
      }

      function isImage(el) {
        return el.tagName.toLowerCase() === 'img' || el.tagName.toLowerCase() === 'svg';
      }

      function highlightElement(el) {
        if (selectedElement) {
          selectedElement.style.outline = '';
          selectedElement.style.outlineOffset = '';
        }
        selectedElement = el;
        if (el) {
          el.style.outline = '2px solid #7c3aed';
          el.style.outlineOffset = '2px';
          // 滚动到视图中
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      function enterTextEdit(el) {
        if (!el || el.isContentEditable) return;
        // 强制允许文本选择，避免父元素 user-select: none 导致无法编辑
        el.contentEditable = 'true';
        el.style.userSelect = 'text';
        el.style.webkitUserSelect = 'text';
        el.style.pointerEvents = 'auto';
        try {
          el.focus();
        } catch(e) {}
        // 将光标移到元素末尾
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch(e) {}
        const onBlur = function() {
          el.contentEditable = 'false';
          el.style.userSelect = '';
          el.style.webkitUserSelect = '';
          el.style.pointerEvents = '';
          el.removeEventListener('blur', onBlur);
          window.parent.postMessage({
            type: 'ELEMENT_TEXT_CHANGED',
            selector: generateSelector(el),
            text: el.textContent,
          }, '*');
        };
        el.addEventListener('blur', onBlur);
      }

      document.addEventListener('click', function(e) {
        if (!isEditMode) return;
        const el = e.target;
        if (!el || el === document.body || el === document.documentElement) return;

        // 如果点击在已有 contenteditable 元素内，不阻止默认行为，让浏览器处理光标和选择
        const editableRoot = el.closest ? el.closest('[contenteditable="true"]') : null;
        if (editableRoot) {
          highlightElement(editableRoot);
          return;
        }

        // 普通元素：仅选中
        e.preventDefault();
        e.stopPropagation();
        highlightElement(el);
        window.parent.postMessage({
          type: 'ELEMENT_SELECTED',
          selector: generateSelector(el),
          tagName: el.tagName,
          textContent: el.textContent?.substring(0, 100),
          isTextEditable: isTextEditable(el),
          isImage: isImage(el),
          computedStyles: getComputedStyleMap(el),
          rect: el.getBoundingClientRect(),
        }, '*');
      }, true);

      document.addEventListener('dblclick', function(e) {
        if (!isEditMode) return;
        const el = e.target;
        if (!el || !isTextEditable(el)) return;
        if (el.isContentEditable) return;
        e.preventDefault();
        e.stopPropagation();
        enterTextEdit(el);
        highlightElement(el);
        window.parent.postMessage({
          type: 'ELEMENT_SELECTED',
          selector: generateSelector(el),
          tagName: el.tagName,
          textContent: el.textContent?.substring(0, 100),
          isTextEditable: true,
          isImage: isImage(el),
          computedStyles: getComputedStyleMap(el),
          rect: el.getBoundingClientRect(),
        }, '*');
      }, true);

      // 阻止链接跳转
      document.addEventListener('click', function(e) {
        if (!isEditMode) return;
        const el = e.target.closest('a');
        if (el) {
          e.preventDefault();
        }
      }, true);

      window.addEventListener('message', function(e) {
        if (!e.data || !e.data.type) return;
        if (e.data.type === 'DECKFORGE_SET_EDIT_MODE') {
          isEditMode = e.data.enabled;
          if (!isEditMode && selectedElement) {
            selectedElement.style.outline = '';
            selectedElement.style.outlineOffset = '';
            selectedElement = null;
          }
        }
        if (e.data.type === 'DECKFORGE_SHOW_PAGE') {
          showSlide(e.data.index);
        }
        if (e.data.type === 'DECKFORGE_APPLY_STYLE') {
          const target = document.querySelector(e.data.selector);
          if (target) target.style[e.data.property] = e.data.value;
        }
        if (e.data.type === 'DECKFORGE_APPLY_MULTIPLE_STYLES') {
          const target = document.querySelector(e.data.selector);
          if (target && e.data.styles) {
            for (const key in e.data.styles) {
              if (Object.prototype.hasOwnProperty.call(e.data.styles, key)) {
                target.style[key] = e.data.styles[key];
              }
            }
          }
        }
        if (e.data.type === 'DECKFORGE_APPLY_TEXT') {
          const target = document.querySelector(e.data.selector);
          if (target) target.textContent = e.data.text;
        }
        if (e.data.type === 'DECKFORGE_REPLACE_IMAGE') {
          const target = document.querySelector(e.data.selector);
          if (target && target.tagName.toLowerCase() === 'img') {
            target.src = e.data.imageData;
          }
        }
        if (e.data.type === 'DECKFORGE_REPLACE_HTML') {
          const target = document.querySelector(e.data.selector);
          if (target) {
            try {
              const wrapper = document.createElement('div');
              wrapper.innerHTML = e.data.html;
              const newEl = wrapper.firstElementChild || wrapper;
              target.replaceWith(newEl);
            } catch (err) {
              console.error('Replace HTML failed:', err);
            }
          }
        }
      });

      // 初始化：查找所有 slides，默认显示第一个
      findAllSlides();
      showSlide(0);
    })();
  `;
  iframe.contentDocument.head.appendChild(script);
}

/**
 * 将 CSS/JS 内联到 HTML 中，生成单文件 HTML
 */
export function inlineResources(html: string, fileTree: { path: string; content?: string | ArrayBuffer }[]): string {
  let result = html;

  // 替换 <link rel="stylesheet" href="...">
  result = result.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href) => {
      const file = fileTree.find((f) => f.path === href || f.path.endsWith(href));
      if (file && file.content && typeof file.content === 'string') {
        return `<style>${file.content}</style>`;
      }
      return match;
    }
  );

  // 替换 <script src="..."></script>
  result = result.replace(
    /<script[^>]*src=["']([^"']+)["'][^>]*>(?:<\/script>)?/gi,
    (match, src) => {
      const file = fileTree.find((f) => f.path === src || f.path.endsWith(src));
      if (file && file.content && typeof file.content === 'string') {
        return `<script>${file.content}</script>`;
      }
      return match;
    }
  );

  return result;
}
