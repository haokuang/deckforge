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
 * 生成 iframe 编辑桥接脚本，单独导出便于对真实演示文稿做集成验证。
 */
export function createEditorBridgeScript(): string {
  return `
    (function() {
      if (window.__deckforgeBridgeLoaded) return;
      window.__deckforgeBridgeLoaded = true;

      var selectedElement = null;
      var multiSelection = [];
      var isEditMode = false;
      var allSlides = [];
      var currentSlideIndex = 0;
      var originalDisplayStyles = new Map();
      var originalSlideStates = [];
      var managedStateClasses = [];

      // 撤销/重做：基于受影响页的 innerHTML 快照，覆盖样式、文本、图片、
      // HTML 替换、元素增删与 AI 修改等全部变更类型。
      var undoStack = [];
      var redoStack = [];
      var HISTORY_LIMIT = 50;
      var clipboardHtml = null;
      var lastNudge = { time: 0, key: '' };

      // Agent 页级锁：被锁定的页在任务期间不响应人为编辑，并显示遮罩。
      var agentLockedSlides = new Set();
      var agentLockOverlay = null;

      // 拖拽/缩放状态
      var dragState = null;
      var selectionLayer = null;

      var STATE_CLASS_CANDIDATES = [
        'active', 'current', 'visible', 'show', 'selected',
        'is-active', 'is-current', 'is-visible', 'shown', 'in-view',
      ];

      // 通用 Slide 选择器（在未检测到知名库时使用）
      var GENERIC_SELECTORS = [
        '.slide', '.page', '.chapter',
        '[data-slide]', '[data-page]', '[data-section]',
        '.swiper-slide', '.carousel-item',
      ];

      function getOriginalDisplay(el) {
        if (!originalDisplayStyles.has(el)) {
          originalDisplayStyles.set(el, readEffectiveDisplay(el));
        }
        return originalDisplayStyles.get(el);
      }

      function readEffectiveDisplay(el) {
        // 先尝试读取当前计算样式（若元素已可见）
        var cs = window.getComputedStyle(el);
        if (cs.display && cs.display !== 'none') return cs.display;

        // 元素当前不可见，临时解禁并读取真实 display，避免把 none 当作原始值
        var prevDisplay = el.style.display;
        var prevVisibility = el.style.visibility;
        var prevOpacity = el.style.opacity;
        var prevPosition = el.style.position;
        el.style.display = '';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.style.position = 'absolute';
        var effective = window.getComputedStyle(el).display || 'block';
        el.style.display = prevDisplay;
        el.style.visibility = prevVisibility;
        el.style.opacity = prevOpacity;
        el.style.position = prevPosition;
        return effective;
      }

      function inferDisplayType(el) {
        // 优先从匹配的 CSS 规则读取 display
        var fromCss = readDisplayFromCssRules(el);
        if (fromCss) return fromCss;

        // 根据标签推断一个合理的 display 值
        var tag = el.tagName.toLowerCase();
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
          var sheets = Array.from(document.styleSheets);
          for (var s = 0; s < sheets.length; s++) {
            var sheet = sheets[s];
            var rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            for (var r = 0; r < rules.length; r++) {
              var rule = rules[r];
              if (rule.selectorText && typeof rule.selectorText === 'string') {
                var selectors = rule.selectorText.split(',');
                for (var i = 0; i < selectors.length; i++) {
                  if (el.matches(selectors[i].trim())) {
                    var display = rule.style.display;
                    if (display && display !== 'none') return display;
                  }
                }
              }
            }
          }
        } catch (e) {}
        return null;
      }

      // ---------- 选择与高亮 ----------

      function clearHighlightStyles() {
        if (selectedElement) {
          selectedElement.style.outline = '';
          selectedElement.style.outlineOffset = '';
        }
        multiSelection.forEach(function(el) {
          el.style.outline = '';
          el.style.outlineOffset = '';
        });
      }

      function applyHighlightStyles() {
        if (selectedElement && document.contains(selectedElement)) {
          selectedElement.style.outline = '2px solid #7c3aed';
          selectedElement.style.outlineOffset = '2px';
        }
      }

      function clearSelection() {
        clearHighlightStyles();
        selectedElement = null;
        multiSelection = [];
        if (selectionLayer) selectionLayer.innerHTML = '';
      }

      function setSelection(els) {
        clearHighlightStyles();
        multiSelection = els || [];
        selectedElement = multiSelection[0] || null;
        applyHighlightStyles();
        renderSelectionLayer();
      }

      function toggleMultiSelection(el) {
        var idx = multiSelection.indexOf(el);
        if (idx >= 0) {
          var next = multiSelection.slice();
          next.splice(idx, 1);
          if (next.length === 0) { clearSelection(); postSelectionCleared(); return; }
          setSelection(next);
        } else {
          setSelection(multiSelection.concat([el]));
        }
      }

      function postSelection() {
        if (!selectedElement) return;
        window.parent.postMessage({
          type: 'ELEMENT_SELECTED',
          selector: generateSelector(selectedElement),
          tagName: selectedElement.tagName,
          textContent: selectedElement.textContent ? String(selectedElement.textContent).substring(0, 100) : '',
          isTextEditable: isTextEditable(selectedElement),
          isImage: isImage(selectedElement),
          computedStyles: getComputedStyleMap(selectedElement),
          rect: selectedElement.getBoundingClientRect(),
          selectionCount: multiSelection.length,
        }, '*');
      }

      function postSelectionCleared() {
        window.parent.postMessage({ type: 'DECKFORGE_SELECTION_CLEARED' }, '*');
      }

      function toastToHost(message, toastType) {
        window.parent.postMessage({ type: 'DECKFORGE_TOAST', message: message, toastType: toastType || 'info' }, '*');
      }

      // ---------- 选中框 / 缩放手柄 / 拖拽 ----------

      function ensureSelectionLayer() {
        if (selectionLayer) return selectionLayer;
        selectionLayer = document.createElement('div');
        selectionLayer.id = '__deckforge-selection-layer';
        selectionLayer.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
        document.body.appendChild(selectionLayer);
        return selectionLayer;
      }

      function rectStyle(r) {
        return 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;';
      }

      var HANDLE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      var HANDLE_CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };

      function renderSelectionLayer() {
        if (!selectionLayer) {
          if (multiSelection.length === 0) return;
          ensureSelectionLayer();
        }
        selectionLayer.innerHTML = '';
        multiSelection.forEach(function(el, i) {
          if (!document.contains(el)) return;
          var r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;
          var box = document.createElement('div');
          box.style.cssText = 'position:fixed;pointer-events:none;border:1px dashed rgba(124,58,237,0.85);' + rectStyle(r);
          selectionLayer.appendChild(box);
          if (i === 0) {
            HANDLE_DIRS.forEach(function(dir) {
              var h = document.createElement('div');
              var hx = r.left + (dir.indexOf('w') >= 0 ? 0 : (dir.indexOf('e') >= 0 ? r.width : r.width / 2));
              var hy = r.top + (dir.indexOf('n') >= 0 ? 0 : (dir.indexOf('s') >= 0 ? r.height : r.height / 2));
              h.style.cssText = 'position:fixed;pointer-events:auto;width:11px;height:11px;margin-left:-5.5px;margin-top:-5.5px;background:#fff;border:2px solid #7c3aed;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:' + HANDLE_CURSORS[dir] + ';left:' + hx + 'px;top:' + hy + 'px;';
              h.addEventListener('mousedown', function(ev) {
                ev.preventDefault();
                ev.stopPropagation();
                beginResize(ev, dir);
              }, true);
              selectionLayer.appendChild(h);
            });
          }
        });
      }

      function pushHistory() {
        var slide = allSlides[currentSlideIndex];
        if (!slide) return;
        // 快照中不能包含选中高亮等 DeckForge 临时样式
        clearHighlightStyles();
        undoStack.push({ index: currentSlideIndex, html: slide.innerHTML });
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
        redoStack.length = 0;
        applyHighlightStyles();
        notifyHistory();
      }

      function notifyHistory() {
        window.parent.postMessage({
          type: 'DECKFORGE_HISTORY',
          undoCount: undoStack.length,
          redoCount: redoStack.length,
        }, '*');
      }

      function doUndo() {
        if (!undoStack.length) return;
        clearHighlightStyles();
        var entry = undoStack.pop();
        var slide = allSlides[entry.index];
        if (slide) {
          redoStack.push({ index: entry.index, html: slide.innerHTML });
          slide.innerHTML = entry.html;
        }
        // innerHTML 还原后原选中元素已脱离文档
        clearSelection();
        postSelectionCleared();
        notifyHistory();
        updateAgentLockOverlay();
      }

      function doRedo() {
        if (!redoStack.length) return;
        clearHighlightStyles();
        var entry = redoStack.pop();
        var slide = allSlides[entry.index];
        if (slide) {
          undoStack.push({ index: entry.index, html: slide.innerHTML });
          slide.innerHTML = entry.html;
        }
        clearSelection();
        postSelectionCleared();
        notifyHistory();
        updateAgentLockOverlay();
      }

      function ensurePositioned(el) {
        var cs = window.getComputedStyle(el);
        if (cs.position === 'static') el.style.position = 'relative';
      }

      function nudgePosition(el, dx, dy) {
        if (!dx && !dy) return;
        ensurePositioned(el);
        var cs = window.getComputedStyle(el);
        var left = parseFloat(el.style.left);
        if (isNaN(left)) left = parseFloat(cs.left);
        if (isNaN(left)) left = 0;
        var top = parseFloat(el.style.top);
        if (isNaN(top)) top = parseFloat(cs.top);
        if (isNaN(top)) top = 0;
        el.style.left = (left + dx) + 'px';
        el.style.top = (top + dy) + 'px';
      }

      function beginPotentialDrag(e, el) {
        dragState = { mode: 'maybe-move', el: el, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
        window.addEventListener('mousemove', onDragMove, true);
        window.addEventListener('mouseup', onDragEnd, true);
      }

      function beginResize(e, dir) {
        var el = selectedElement;
        if (!el) return;
        dragState = { mode: 'maybe-resize', el: el, dir: dir, startX: e.clientX, startY: e.clientY, orig: el.getBoundingClientRect(), moved: false };
        window.addEventListener('mousemove', onDragMove, true);
        window.addEventListener('mouseup', onDragEnd, true);
      }

      function onDragMove(e) {
        if (!dragState) return;
        if (dragState.mode === 'maybe-move') {
          if (Math.abs(e.clientX - dragState.startX) + Math.abs(e.clientY - dragState.startY) > 3) {
            dragState.mode = 'move';
            pushHistory();
          } else {
            return;
          }
        }
        if (dragState.mode === 'move') {
          nudgePosition(dragState.el, e.clientX - dragState.lastX, e.clientY - dragState.lastY);
          dragState.lastX = e.clientX;
          dragState.lastY = e.clientY;
          dragState.moved = true;
          renderSelectionLayer();
          return;
        }
        if (dragState.mode === 'maybe-resize') {
          if (Math.abs(e.clientX - dragState.startX) + Math.abs(e.clientY - dragState.startY) > 2) {
            dragState.mode = 'resize';
            pushHistory();
          } else {
            return;
          }
        }
        if (dragState.mode === 'resize') applyResize(e);
      }

      function applyResize(e) {
        var el = dragState.el;
        var orig = dragState.orig;
        var dx = e.clientX - dragState.startX;
        var dy = e.clientY - dragState.startY;
        var dir = dragState.dir;
        var minSize = 24;
        var width = orig.width;
        var height = orig.height;
        var left = orig.left;
        var top = orig.top;
        if (dir.indexOf('e') >= 0) width = Math.max(minSize, orig.width + dx);
        if (dir.indexOf('s') >= 0) height = Math.max(minSize, orig.height + dy);
        if (dir.indexOf('w') >= 0) { width = Math.max(minSize, orig.width - dx); left = orig.left + (orig.width - width); }
        if (dir.indexOf('n') >= 0) { height = Math.max(minSize, orig.height - dy); top = orig.top + (orig.height - height); }
        if (e.shiftKey && el.tagName && el.tagName.toLowerCase() === 'img' && orig.width > 0) {
          height = Math.max(minSize, width * orig.height / orig.width);
          if (dir.indexOf('n') >= 0) top = orig.top + (orig.height - height);
        }
        var cs = window.getComputedStyle(el);
        if (cs.display === 'inline') el.style.display = 'inline-block';
        var before = el.getBoundingClientRect();
        nudgePosition(el, left - before.left, top - before.top);
        el.style.width = Math.round(width) + 'px';
        el.style.height = Math.round(height) + 'px';
        dragState.moved = true;
        renderSelectionLayer();
      }

      function onDragEnd() {
        window.removeEventListener('mousemove', onDragMove, true);
        window.removeEventListener('mouseup', onDragEnd, true);
        if (dragState && dragState.moved) postSelection();
        dragState = null;
      }

      // ---------- 元素操作 ----------

      function stripDeckforgeArtifacts(el) {
        if (!el.style) return;
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.removeAttribute('data-deckforge-editing');
        el.removeAttribute('contenteditable');
      }

      function copySelectedElement() {
        if (!selectedElement) { toastToHost('请先选中元素', 'warning'); return; }
        var clone = selectedElement.cloneNode(true);
        stripDeckforgeArtifacts(clone);
        clone.querySelectorAll('[data-deckforge-editing]').forEach(function(child) { stripDeckforgeArtifacts(child); });
        clipboardHtml = clone.outerHTML;
        toastToHost('已复制元素，Ctrl+V 粘贴', 'info');
      }

      function pasteClipboardElement() {
        if (!clipboardHtml) { toastToHost('剪贴板中没有元素，请先 Ctrl+C 复制', 'warning'); return; }
        var slide = allSlides[currentSlideIndex];
        if (!slide) return;
        pushHistory();
        var tpl = document.createElement('div');
        tpl.innerHTML = clipboardHtml;
        var node = tpl.firstElementChild;
        if (!node) return;
        var refParent = selectedElement && document.contains(selectedElement) ? selectedElement.parentElement : slide;
        var ref = selectedElement && document.contains(selectedElement) ? selectedElement.nextSibling : null;
        refParent.insertBefore(node, ref);
        nudgePosition(node, 12, 12);
        setSelection([node]);
        postSelection();
      }

      function duplicateSelectedElement() {
        if (!selectedElement) { toastToHost('请先选中元素', 'warning'); return; }
        var clone = selectedElement.cloneNode(true);
        stripDeckforgeArtifacts(clone);
        pushHistory();
        selectedElement.parentNode.insertBefore(clone, selectedElement.nextSibling);
        nudgePosition(clone, 12, 12);
        setSelection([clone]);
        postSelection();
      }

      function deleteSelectedElements() {
        if (!multiSelection.length) return;
        pushHistory();
        multiSelection.forEach(function(el) { if (el.parentNode) el.parentNode.removeChild(el); });
        clearSelection();
        postSelectionCleared();
      }

      function nudgeSelected(dx, dy) {
        if (!multiSelection.length) return;
        var now = Date.now();
        var key = selectedElement ? generateSelector(selectedElement) : '';
        // 连续方向键微调合并为一条历史记录
        if (now - lastNudge.time > 800 || lastNudge.key !== key) pushHistory();
        lastNudge = { time: now, key: key };
        multiSelection.forEach(function(el) { nudgePosition(el, dx, dy); });
        renderSelectionLayer();
      }

      function alignSelection(mode) {
        var els = multiSelection.slice();
        if (!els.length) return;
        var rects = els.map(function(el) { return el.getBoundingClientRect(); });
        var slide = allSlides[currentSlideIndex];
        var slideRect = slide ? slide.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
        var bounds = rects.reduce(function(acc, r) {
          return {
            left: Math.min(acc.left, r.left),
            top: Math.min(acc.top, r.top),
            right: Math.max(acc.right, r.left + r.width),
            bottom: Math.max(acc.bottom, r.top + r.height),
          };
        }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
        bounds.width = bounds.right - bounds.left;
        bounds.height = bounds.bottom - bounds.top;
        var ref = els.length > 1 ? bounds : slideRect;

        pushHistory();

        if (mode === 'distribute-h' && els.length >= 3) {
          var orderH = els.map(function(el, i) { return { el: el, r: rects[i] }; })
            .sort(function(a, b) { return (a.r.left + a.r.width / 2) - (b.r.left + b.r.width / 2); });
          var startH = orderH[0].r.left + orderH[0].r.width / 2;
          var endH = orderH[orderH.length - 1].r.left + orderH[orderH.length - 1].r.width / 2;
          var stepH = (endH - startH) / (orderH.length - 1);
          orderH.forEach(function(item, i) {
            if (i === 0 || i === orderH.length - 1) return;
            var cur = item.r.left + item.r.width / 2;
            nudgePosition(item.el, startH + stepH * i - cur, 0);
          });
        } else if (mode === 'distribute-v' && els.length >= 3) {
          var orderV = els.map(function(el, i) { return { el: el, r: rects[i] }; })
            .sort(function(a, b) { return (a.r.top + a.r.height / 2) - (b.r.top + b.r.height / 2); });
          var startV = orderV[0].r.top + orderV[0].r.height / 2;
          var endV = orderV[orderV.length - 1].r.top + orderV[orderV.length - 1].r.height / 2;
          var stepV = (endV - startV) / (orderV.length - 1);
          orderV.forEach(function(item, i) {
            if (i === 0 || i === orderV.length - 1) return;
            var cur = item.r.top + item.r.height / 2;
            nudgePosition(item.el, 0, startV + stepV * i - cur);
          });
        } else {
          els.forEach(function(el, i) {
            var r = rects[i];
            var targetLeft = r.left;
            var targetTop = r.top;
            if (mode === 'left') targetLeft = ref.left;
            if (mode === 'hcenter') targetLeft = ref.left + (ref.width - r.width) / 2;
            if (mode === 'right') targetLeft = ref.left + ref.width - r.width;
            if (mode === 'top') targetTop = ref.top;
            if (mode === 'vcenter') targetTop = ref.top + (ref.height - r.height) / 2;
            if (mode === 'bottom') targetTop = ref.top + ref.height - r.height;
            nudgePosition(el, targetLeft - r.left, targetTop - r.top);
          });
        }
        renderSelectionLayer();
      }

      function insertElement(kind) {
        var slide = allSlides[currentSlideIndex];
        if (!slide) return;
        pushHistory();
        ensurePositioned(slide);
        var sr = slide.getBoundingClientRect();
        var specs = {
          textbox: { w: 360, h: 0, html: '<div style="position:absolute;left:Lpx;top:Tpx;width:360px;font-size:28px;line-height:1.5;color:#1f2430;padding:10px 14px;box-sizing:border-box;">双击编辑文字</div>' },
          rect: { w: 240, h: 150, html: '<div style="position:absolute;left:Lpx;top:Tpx;width:240px;height:150px;background:rgba(91,141,239,0.92);border-radius:12px;"></div>' },
          circle: { w: 160, h: 160, html: '<div style="position:absolute;left:Lpx;top:Tpx;width:160px;height:160px;background:rgba(91,141,239,0.92);border-radius:50%;"></div>' },
          line: { w: 260, h: 4, html: '<div style="position:absolute;left:Lpx;top:Tpx;width:260px;height:4px;background:rgba(91,141,239,0.92);border-radius:2px;"></div>' },
        };
        var spec = specs[kind];
        if (!spec) return;
        var left = Math.max(0, Math.round(sr.width / 2 - spec.w / 2));
        var top = Math.max(0, Math.round(sr.height / 2 - (spec.h || 40) / 2));
        var tpl = document.createElement('div');
        tpl.innerHTML = spec.html.replace('Lpx', left + 'px').replace('Tpx', top + 'px');
        var node = tpl.firstElementChild;
        slide.appendChild(node);
        setSelection([node]);
        if (kind === 'textbox') {
          enterTextEdit(node);
        }
        postSelection();
      }

      // ---------- 幻灯片级操作 ----------

      function rebuildSlideIndex() {
        findAllSlides();
        captureOriginalSlideStates();
      }

      function clearStructuralHistory() {
        // 历史快照按页索引存储，页序变化后无法可靠回放，结构操作时清空。
        undoStack.length = 0;
        redoStack.length = 0;
      }

      function extractSlideTitle(el) {
        var heading = el.querySelector && el.querySelector('h1, h2, h3, .title, [data-title]');
        if (heading && heading.textContent && heading.textContent.trim()) return heading.textContent.trim();
        var firstText = el.textContent ? el.textContent.trim() : '';
        if (firstText) return firstText.slice(0, 30) + (firstText.length > 30 ? '...' : '');
        return undefined;
      }

      function detectSlideType(el) {
        var className = (el.className && typeof el.className === 'string' ? el.className : '').toLowerCase();
        var tagName = el.tagName ? el.tagName.toLowerCase() : '';
        if (className.indexOf('cover') >= 0 || className.indexOf('title') >= 0) return 'cover';
        if (className.indexOf('chapter') >= 0) return 'chapter';
        if (className.indexOf('transition') >= 0) return 'transition';
        if (className.indexOf('data') >= 0 || className.indexOf('chart') >= 0) return 'data';
        if (tagName === 'section' || className.indexOf('slide') >= 0 || className.indexOf('page') >= 0) return 'slide';
        return 'unknown';
      }

      function notifySlidesChanged() {
        var slides = allSlides.map(function(el, i) {
          return { index: i, title: extractSlideTitle(el), type: detectSlideType(el) };
        });
        window.parent.postMessage({ type: 'DECKFORGE_SLIDES_CHANGED', slides: slides, current: currentSlideIndex }, '*');
      }

      function requirePaginated() {
        if (allSlides.length > 0 && allSlides[0] === document.body) {
          toastToHost('当前文档没有分页结构，无法执行页级操作', 'warning');
          return false;
        }
        return true;
      }

      function insertSlideAfter(index) {
        if (!requirePaginated()) return;
        var base = allSlides[index] || allSlides[allSlides.length - 1];
        if (!base || !base.parentNode) return;
        clearStructuralHistory();
        var el = document.createElement(base.tagName);
        var cls = (base.className || '').split(/\\s+/).filter(function(c) {
          return c && STATE_CLASS_CANDIDATES.indexOf(c) < 0 && c.indexOf('deckforge-') !== 0;
        });
        if (cls.length) el.className = cls.join(' ');
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<h1 style="margin:0;font-size:56px;">新增页面</h1><p style="margin:16px 0 0;font-size:26px;opacity:0.65;">双击编辑此页内容</p>';
        base.parentNode.insertBefore(el, base.nextSibling);
        clearSelection();
        rebuildSlideIndex();
        showSlide(index + 1);
        notifySlidesChanged();
        notifyHistory();
      }

      function duplicateSlide(index) {
        if (!requirePaginated()) return;
        var base = allSlides[index];
        if (!base || !base.parentNode) return;
        clearStructuralHistory();
        var clone = base.cloneNode(true);
        STATE_CLASS_CANDIDATES.forEach(function(cls) { clone.classList.remove(cls); });
        clone.removeAttribute('data-deckforge-slide-index');
        clone.setAttribute('aria-hidden', 'true');
        base.parentNode.insertBefore(clone, base.nextSibling);
        clearSelection();
        rebuildSlideIndex();
        showSlide(index + 1);
        notifySlidesChanged();
        notifyHistory();
      }

      function deleteSlide(index) {
        if (!requirePaginated()) return;
        if (allSlides.length <= 1) { toastToHost('至少保留一页', 'warning'); return; }
        var target = allSlides[index];
        if (!target || !target.parentNode) return;
        clearStructuralHistory();
        target.parentNode.removeChild(target);
        clearSelection();
        rebuildSlideIndex();
        showSlide(Math.min(index, allSlides.length - 1));
        notifySlidesChanged();
        notifyHistory();
      }

      function moveSlide(from, to) {
        if (!requirePaginated()) return;
        var node = allSlides[from];
        if (!node || !node.parentNode) return;
        var ref = to < from ? allSlides[to] : (allSlides[to] ? allSlides[to].nextSibling : null);
        if (!ref && to >= allSlides.length - 1) ref = null;
        clearStructuralHistory();
        node.parentNode.insertBefore(node, ref);
        clearSelection();
        rebuildSlideIndex();
        showSlide(to);
        notifySlidesChanged();
        notifyHistory();
      }

      // ---------- 右键菜单 ----------

      var contextMenuEl = null;

      function closeContextMenu() {
        if (contextMenuEl && contextMenuEl.parentNode) contextMenuEl.parentNode.removeChild(contextMenuEl);
        contextMenuEl = null;
        document.removeEventListener('click', closeContextMenu, true);
        document.removeEventListener('scroll', closeContextMenu, true);
      }

      function menuItem(label, danger, onClick) {
        var item = document.createElement('div');
        item.textContent = label;
        item.style.cssText = 'padding:7px 14px;font-size:13px;color:' + (danger ? '#f87171' : '#e8eaf2') + ';white-space:nowrap;border-radius:8px;cursor:pointer;';
        item.addEventListener('mouseenter', function() { item.style.background = 'rgba(124,58,237,0.25)'; });
        item.addEventListener('mouseleave', function() { item.style.background = 'transparent'; });
        item.addEventListener('click', function(ev) { ev.stopPropagation(); closeContextMenu(); onClick(); });
        return item;
      }

      function menuSeparator() {
        var sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:rgba(255,255,255,0.12);margin:4px 8px;';
        return sep;
      }

      function openContextMenu(x, y, el) {
        closeContextMenu();
        var menu = document.createElement('div');
        menu.id = '__deckforge-context-menu';
        menu.style.cssText = 'position:fixed;z-index:2147483647;min-width:160px;padding:6px;border-radius:12px;background:rgba(20,22,32,0.95);border:1px solid rgba(255,255,255,0.14);box-shadow:0 12px 40px rgba(0,0,0,0.45);backdrop-filter:blur(8px);';

        if (el) {
          menu.appendChild(menuItem('复制元素', false, copySelectedElement));
          menu.appendChild(menuItem('原位克隆', false, duplicateSelectedElement));
          menu.appendChild(menuItem('删除元素', true, deleteSelectedElements));
          menu.appendChild(menuItem('置于顶层', false, function() { setZExtreme(el, true); }));
          menu.appendChild(menuItem('置于底层', false, function() { setZExtreme(el, false); }));
          menu.appendChild(menuSeparator());
        }
        menu.appendChild(menuItem('新增文本框', false, function() { insertElement('textbox'); }));
        menu.appendChild(menuItem('新增矩形', false, function() { insertElement('rect'); }));
        menu.appendChild(menuItem('新增圆形', false, function() { insertElement('circle'); }));
        menu.appendChild(menuSeparator());
        menu.appendChild(menuItem('在本页后新增页', false, function() { insertSlideAfter(currentSlideIndex); }));
        menu.appendChild(menuItem('复制本页', false, function() { duplicateSlide(currentSlideIndex); }));
        menu.appendChild(menuItem('删除本页', true, function() { deleteSlide(currentSlideIndex); }));

        document.body.appendChild(menu);
        var mw = menu.offsetWidth;
        var mh = menu.offsetHeight;
        menu.style.left = Math.min(x, window.innerWidth - mw - 8) + 'px';
        menu.style.top = Math.min(y, window.innerHeight - mh - 8) + 'px';
        contextMenuEl = menu;
        setTimeout(function() {
          document.addEventListener('click', closeContextMenu, true);
          document.addEventListener('scroll', closeContextMenu, true);
        }, 0);
      }

      function setZExtreme(el, toTop) {
        var slide = allSlides[currentSlideIndex];
        var extreme = 0;
        if (slide) {
          slide.querySelectorAll('*').forEach(function(child) {
            if (child === el) return;
            var z = parseInt(window.getComputedStyle(child).zIndex, 10);
            if (!isNaN(z) && (toTop ? z > extreme : (extreme === 0 || z < extreme))) extreme = z;
          });
        }
        pushHistory();
        ensurePositioned(el);
        el.style.zIndex = String(toTop ? extreme + 1 : extreme - 1);
      }

      // ---------- 行内富文本工具栏 ----------

      var rtToolbar = null;

      function execInlineCommand(cmd, value) {
        try {
          document.execCommand('styleWithCSS', false, true);
          document.execCommand(cmd, false, value || null);
        } catch (e) {}
      }

      function hideInlineToolbar() {
        if (rtToolbar && rtToolbar.parentNode) rtToolbar.parentNode.removeChild(rtToolbar);
        rtToolbar = null;
      }

      function rtButton(label, title, onDown) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.title = title;
        btn.style.cssText = 'width:28px;height:28px;border:none;border-radius:6px;background:transparent;color:#e8eaf2;font-size:13px;font-weight:600;cursor:pointer;';
        btn.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); onDown(); });
        btn.addEventListener('mouseenter', function() { btn.style.background = 'rgba(124,58,237,0.35)'; });
        btn.addEventListener('mouseleave', function() { btn.style.background = 'transparent'; });
        return btn;
      }

      function showInlineToolbar(range) {
        if (!rtToolbar) {
          rtToolbar = document.createElement('div');
          rtToolbar.id = '__deckforge-rt-toolbar';
          rtToolbar.style.cssText = 'position:fixed;z-index:2147483647;display:flex;align-items:center;gap:2px;padding:4px;border-radius:10px;background:rgba(20,22,32,0.95);border:1px solid rgba(255,255,255,0.14);box-shadow:0 8px 30px rgba(0,0,0,0.4);';
          rtToolbar.appendChild(rtButton('B', '粗体', function() { execInlineCommand('bold'); }));
          rtToolbar.appendChild(rtButton('I', '斜体', function() { execInlineCommand('italic'); }));
          rtToolbar.appendChild(rtButton('U', '下划线', function() { execInlineCommand('underline'); }));
          rtToolbar.appendChild(rtButton('S', '删除线', function() { execInlineCommand('strikeThrough'); }));
          var color = document.createElement('input');
          color.type = 'color';
          color.title = '文字颜色';
          color.style.cssText = 'width:28px;height:28px;border:none;border-radius:6px;background:transparent;cursor:pointer;padding:0;';
          color.addEventListener('mousedown', function(e) { e.stopPropagation(); });
          color.addEventListener('input', function() { execInlineCommand('foreColor', color.value); });
          rtToolbar.appendChild(color);
          rtToolbar.appendChild(rtButton('⌫', '清除格式', function() { execInlineCommand('removeFormat'); }));
          document.body.appendChild(rtToolbar);
        }
        var rect = range.getBoundingClientRect();
        var x = Math.max(8, Math.min(rect.left, window.innerWidth - 240));
        var y = rect.top - 46;
        if (y < 8) y = rect.bottom + 8;
        rtToolbar.style.left = x + 'px';
        rtToolbar.style.top = y + 'px';
        rtToolbar.style.display = 'flex';
      }

      document.addEventListener('selectionchange', function() {
        if (!isEditMode || agentLockedSlides.has(currentSlideIndex)) { hideInlineToolbar(); return; }
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { hideInlineToolbar(); return; }
        var range = sel.getRangeAt(0);
        var anchor = range.commonAncestorContainer;
        var el = anchor.nodeType === 1 ? anchor : anchor.parentElement;
        var editable = el && el.closest ? el.closest('[contenteditable="true"]') : null;
        if (!editable) { hideInlineToolbar(); return; }
        showInlineToolbar(range);
      });

      // ---------- Agent 页级锁 ----------

      function ensureAgentLockOverlay() {
        if (agentLockOverlay) return agentLockOverlay;
        agentLockOverlay = document.createElement('div');
        agentLockOverlay.id = '__deckforge-agent-lock';
        agentLockOverlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;background:rgba(8,10,18,0.45);backdrop-filter:blur(2px);cursor:not-allowed;';
        var badge = document.createElement('div');
        badge.style.cssText = 'display:flex;align-items:center;gap:10px;padding:14px 22px;border-radius:16px;background:rgba(20,22,32,0.9);color:#e8eaf2;font:600 14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 12px 40px rgba(0,0,0,0.35);border:1px solid rgba(124,58,237,0.55);';
        badge.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #a78bfa;border-top-color:transparent;border-radius:50%;animation:__deckforge-spin 0.8s linear infinite;"></span><span>AI Agent 正在编辑此页，请稍候…</span>';
        var style = document.createElement('style');
        style.textContent = '@keyframes __deckforge-spin{to{transform:rotate(360deg)}}';
        agentLockOverlay.appendChild(style);
        agentLockOverlay.appendChild(badge);
        document.body.appendChild(agentLockOverlay);
        return agentLockOverlay;
      }

      function updateAgentLockOverlay() {
        if (agentLockedSlides.has(currentSlideIndex)) {
          ensureAgentLockOverlay().style.display = 'flex';
        } else if (agentLockOverlay) {
          agentLockOverlay.style.display = 'none';
        }
      }

      // ---------- 幻灯片检测与切换 ----------

      function detectPresentationLibrary() {
        if (typeof window.Reveal !== 'undefined' && window.Reveal) return 'reveal';
        if (typeof window.impress !== 'undefined' && window.impress) return 'impress';
        if (typeof window.fullpage_api !== 'undefined' && window.fullpage_api) return 'fullpage';
        var swiperEl = document.querySelector('.swiper');
        if (swiperEl && typeof window.Swiper !== 'undefined' && window.Swiper) return 'swiper';
        return 'native';
      }

      function findAllSlides() {
        allSlides = [];

        // 1. reveal.js（已初始化 API）
        if (typeof window.Reveal !== 'undefined' && window.Reveal && window.Reveal.getSlides) {
          try {
            var revealApiSlides = window.Reveal.getSlides();
            if (revealApiSlides && revealApiSlides.length > 1) {
              allSlides = Array.from(revealApiSlides);
              allSlides.forEach(getOriginalDisplay);
              return true;
            }
          } catch (e) {}
        }

        // 2. reveal.js（未初始化 API，仅 DOM 结构）
        try {
          var revealSlides = document.querySelectorAll('.reveal .slides > section');
          if (revealSlides.length > 1) {
            allSlides = Array.from(revealSlides);
            allSlides.forEach(getOriginalDisplay);
            return true;
          }
        } catch (e) {}

        // 3. impress.js
        if (typeof window.impress !== 'undefined' && window.impress) {
          try {
            var steps = document.querySelectorAll('.step');
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
            var sections = document.querySelectorAll('.section');
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
            var swiperSlides = document.querySelectorAll('.swiper-slide');
            if (swiperSlides.length > 1) {
              allSlides = Array.from(swiperSlides);
              allSlides.forEach(getOriginalDisplay);
              return true;
            }
          } catch (e) {}
        }

        // 6. 通用选择器
        for (var i = 0; i < GENERIC_SELECTORS.length; i++) {
          try {
            var els = document.querySelectorAll(GENERIC_SELECTORS[i]);
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
        clearSelection();

        var target = allSlides[index];
        var lib = detectPresentationLibrary();

        // 优先使用知名 PPT/幻灯片库的 API，避免直接覆盖 display 破坏动画/过渡
        if (lib === 'reveal' && typeof window.Reveal.slide === 'function') {
          try {
            window.Reveal.slide(target);
            updateAgentLockOverlay();
            return;
          } catch (e) {}
        }

        if (lib === 'impress') {
          try {
            window.impress().goto(target);
            updateAgentLockOverlay();
            return;
          } catch (e) {}
        }

        if (lib === 'fullpage' && typeof window.fullpage_api.moveTo === 'function') {
          try {
            window.fullpage_api.moveTo(index + 1);
            updateAgentLockOverlay();
            return;
          } catch (e) {}
        }

        if (lib === 'swiper') {
          try {
            var swiperContainer = document.querySelector('.swiper');
            if (swiperContainer && swiperContainer.swiper && typeof swiperContainer.swiper.slideTo === 'function') {
              swiperContainer.swiper.slideTo(index);
              updateAgentLockOverlay();
              return;
            }
          } catch (e) {}
        }

        // 原生降级：识别并尊重页面自身的幻灯片显示约定。
        // 一些演示会组合多个状态类：例如 .active 控制页面容器可见，
        // .visible 再触发内部 reveal 动画。必须整体迁移这些状态类，否则
        // 新页面虽然已激活，其内容仍可能停留在 opacity: 0 的初始态。
        var activeClasses = managedStateClasses.length > 0
          ? managedStateClasses
          : detectActiveClassPatterns();

        if (activeClasses.length > 0) {
          // 类驱动切换：把当前页已有的全部激活/入场状态迁移到目标页。
          allSlides.forEach(function(el, i) {
            var isTarget = i === index;
            activeClasses.forEach(function(cls) { el.classList.toggle(cls, isTarget); });
            // 清除可能由旧逻辑留下的内联 display，让 CSS 类生效
            el.style.display = '';
            // 与页面状态保持一致，避免导入文件的旧 aria-hidden 值残留。
            el.setAttribute('aria-hidden', isTarget ? 'false' : 'true');
          });
        } else {
          // display 驱动切换
          allSlides.forEach(function(el, i) {
            if (i === index) {
              var original = getOriginalDisplay(el);
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
          var bodyDisplay = window.getComputedStyle(document.body).display;
          if (bodyDisplay === 'none') {
            document.body.style.display = 'block';
          }
        }
        // 强制重排以确保样式变更生效
        document.body.offsetHeight;
        updateAgentLockOverlay();
      }

      function detectActiveClassPatterns() {
        if (allSlides.length < 2) return [];
        return STATE_CLASS_CANDIDATES.filter(function(cls) {
          var count = allSlides.filter(function(el) { return el.classList.contains(cls); }).length;
          // 有且仅有部分 slide 拥有该 class，才认为是页面状态标记。
          return count > 0 && count < allSlides.length;
        });
      }

      function captureOriginalSlideStates() {
        managedStateClasses = detectActiveClassPatterns();
        originalSlideStates = allSlides.map(function(el) {
          return {
            stateClasses: STATE_CLASS_CANDIDATES.filter(function(cls) { return el.classList.contains(cls); }),
            ariaHidden: el.getAttribute('aria-hidden'),
            inlineDisplay: el.style.display,
          };
        });
      }

      function serializeDocument() {
        // 高亮、选中框、菜单等属于 DeckForge 的临时 UI，保存前先移除。
        clearSelection();
        closeContextMenu();
        hideInlineToolbar();

        // 给真实 slide 加临时索引，便于在克隆文档中精确恢复加载时状态。
        allSlides.forEach(function(el, index) { el.setAttribute('data-deckforge-slide-index', String(index)); });
        var clone = document.documentElement.cloneNode(true);
        allSlides.forEach(function(el) { el.removeAttribute('data-deckforge-slide-index'); });

        var clonedSlides = clone.querySelectorAll('[data-deckforge-slide-index]');
        clonedSlides.forEach(function(el) {
          var index = Number(el.getAttribute('data-deckforge-slide-index'));
          var original = originalSlideStates[index];
          el.removeAttribute('data-deckforge-slide-index');
          if (!original) return;
          STATE_CLASS_CANDIDATES.forEach(function(cls) { el.classList.remove(cls); });
          original.stateClasses.forEach(function(cls) { el.classList.add(cls); });
          if (original.ariaHidden === null) el.removeAttribute('aria-hidden');
          else el.setAttribute('aria-hidden', original.ariaHidden);
          el.style.display = original.inlineDisplay;
        });

        // 移除仅供预览和编辑使用的注入内容。
        clone.querySelectorAll('#__deckforge-bridge, #__deckforge-reset, #__deckforge-design-size, #__deckforge-agent-lock, #__deckforge-selection-layer, #__deckforge-context-menu, #__deckforge-rt-toolbar').forEach(function(el) { el.remove(); });
        clone.querySelectorAll('[data-deckforge-editing]').forEach(function(el) {
          el.removeAttribute('data-deckforge-editing');
          el.removeAttribute('contenteditable');
          el.style.removeProperty('user-select');
          el.style.removeProperty('-webkit-user-select');
          el.style.removeProperty('pointer-events');
        });

        return '<!DOCTYPE html>\\n' + clone.outerHTML;
      }

      function generateSelector(el) {
        if (!el) return '';
        if (el.id) return '#' + el.id;
        var tag = el.tagName.toLowerCase();
        var classes = Array.from(el.classList).filter(function(c) { return !c.startsWith('deckforge-'); }).join('.');
        var parent = el.parentElement;
        if (!parent) return classes ? tag + '.' + classes : tag;
        var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === el.tagName; });
        var index = siblings.indexOf(el) + 1;
        return classes ? tag + '.' + classes + ':nth-of-type(' + index + ')' : tag + ':nth-of-type(' + index + ')';
      }

      function getComputedStyleMap(el) {
        var cs = window.getComputedStyle(el);
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
        var tag = el.tagName.toLowerCase();
        var editableTags = ['p','h1','h2','h3','h4','h5','h6','span','div','a','li','td','th','label','strong','em','b','i','small'];
        return editableTags.includes(tag) && !el.querySelector('img, svg, canvas, video, iframe');
      }

      function isImage(el) {
        return el.tagName.toLowerCase() === 'img' || el.tagName.toLowerCase() === 'svg';
      }

      function enterTextEdit(el) {
        if (!el || el.isContentEditable) return;
        // 强制允许文本选择，避免父元素 user-select: none 导致无法编辑
        el.setAttribute('data-deckforge-editing', 'true');
        el.contentEditable = 'true';
        el.style.userSelect = 'text';
        el.style.webkitUserSelect = 'text';
        el.style.pointerEvents = 'auto';
        try {
          el.focus();
        } catch(e) {}
        // 将光标移到元素末尾
        try {
          var range = document.createRange();
          var sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch(e) {}
        // 记录进入编辑前的快照，失焦时若内容有变化则入撤销栈
        var baselineIndex = currentSlideIndex;
        var baselineSlide = allSlides[baselineIndex];
        var baselineHtml = baselineSlide ? baselineSlide.innerHTML : null;
        var onBlur = function() {
          el.contentEditable = 'false';
          el.style.userSelect = '';
          el.style.webkitUserSelect = '';
          el.style.pointerEvents = '';
          el.removeAttribute('data-deckforge-editing');
          el.removeEventListener('blur', onBlur);
          if (baselineHtml !== null && allSlides[baselineIndex] && allSlides[baselineIndex].innerHTML !== baselineHtml) {
            undoStack.push({ index: baselineIndex, html: baselineHtml });
            if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
            redoStack.length = 0;
            notifyHistory();
          }
          window.parent.postMessage({
            type: 'ELEMENT_TEXT_CHANGED',
            selector: generateSelector(el),
            text: el.textContent,
          }, '*');
        };
        el.addEventListener('blur', onBlur);
      }

      document.addEventListener('mousedown', function(e) {
        if (!isEditMode) return;
        if (agentLockedSlides.has(currentSlideIndex)) return;
        var el = e.target;
        if (!el || el === document.body || el === document.documentElement) return;
        if (el.closest && el.closest('#__deckforge-selection-layer, #__deckforge-context-menu, #__deckforge-rt-toolbar')) return;
        if (el.closest && el.closest('[contenteditable="true"]')) return;
        if (!multiSelection.length) return;
        if (multiSelection.indexOf(el) < 0) return;
        // 按住已选元素准备拖拽（未按下 Shift 时）；Shift 留给 click 做多选切换
        if (!e.shiftKey) beginPotentialDrag(e, el);
      }, true);

      document.addEventListener('click', function(e) {
        if (!isEditMode) return;
        if (agentLockedSlides.has(currentSlideIndex)) return;
        var el = e.target;
        if (!el || el === document.body || el === document.documentElement) return;
        if (el.closest && el.closest('#__deckforge-selection-layer, #__deckforge-context-menu, #__deckforge-rt-toolbar')) return;

        // 如果点击在已有 contenteditable 元素内，不阻止默认行为，让浏览器处理光标和选择
        var editableRoot = el.closest ? el.closest('[contenteditable="true"]') : null;
        if (editableRoot) {
          setSelection([editableRoot]);
          postSelection();
          return;
        }

        // 普通元素：仅选中
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          toggleMultiSelection(el);
        } else if (multiSelection.indexOf(el) < 0 || multiSelection.length > 1) {
          setSelection([el]);
        }
        postSelection();
      }, true);

      document.addEventListener('dblclick', function(e) {
        if (!isEditMode) return;
        if (agentLockedSlides.has(currentSlideIndex)) return;
        var el = e.target;
        if (!el || !isTextEditable(el)) return;
        if (el.isContentEditable) return;
        e.preventDefault();
        e.stopPropagation();
        enterTextEdit(el);
        setSelection([el]);
        postSelection();
      }, true);

      // 阻止链接跳转
      document.addEventListener('click', function(e) {
        if (!isEditMode) return;
        var el = e.target.closest && e.target.closest('a');
        if (el) {
          e.preventDefault();
        }
      }, true);

      document.addEventListener('contextmenu', function(e) {
        if (!isEditMode) return;
        if (agentLockedSlides.has(currentSlideIndex)) return;
        var target = e.target;
        if (!target) return;
        if (target.closest && target.closest('#__deckforge-context-menu, #__deckforge-selection-layer, #__deckforge-rt-toolbar')) return;
        var editableRoot = target.closest ? target.closest('[contenteditable="true"]') : null;
        if (editableRoot) return; // 文本编辑中保留浏览器原生菜单（复制/粘贴）
        e.preventDefault();
        var el = (target === document.body || target === document.documentElement) ? null : target;
        if (el) {
          setSelection([el]);
          postSelection();
        }
        openContextMenu(e.clientX, e.clientY, el);
      }, true);

      // iframe 内键盘：焦点在 iframe 中时宿主收不到按键，需要在这里处理
      document.addEventListener('keydown', function(e) {
        if (!isEditMode) return;
        if (agentLockedSlides.has(currentSlideIndex)) return;
        var active = document.activeElement;
        if (active && (active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        var meta = e.ctrlKey || e.metaKey;
        if (meta && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
        if (meta && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); doRedo(); return; }
        if (meta && (e.key === 'c' || e.key === 'C')) { if (selectedElement) { e.preventDefault(); copySelectedElement(); } return; }
        if (meta && (e.key === 'v' || e.key === 'V')) { e.preventDefault(); pasteClipboardElement(); return; }
        if (meta && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); duplicateSelectedElement(); return; }
        if (e.key === 'Escape') { if (multiSelection.length) { clearSelection(); postSelectionCleared(); } return; }
        if (!multiSelection.length) return;
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelectedElements(); return; }
        var step = e.shiftKey ? 10 : 1;
        var dx = 0;
        var dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        else return;
        e.preventDefault();
        nudgeSelected(dx, dy);
      }, true);

      document.addEventListener('scroll', function() {
        if (multiSelection.length) renderSelectionLayer();
        if (contextMenuEl) closeContextMenu();
      }, true);

      window.addEventListener('resize', function() {
        if (multiSelection.length) renderSelectionLayer();
      });

      window.addEventListener('message', function(e) {
        if (!e.data || !e.data.type) return;
        if (e.data.type === 'DECKFORGE_SET_EDIT_MODE') {
          isEditMode = e.data.enabled;
          if (!isEditMode) {
            clearSelection();
            postSelectionCleared();
            closeContextMenu();
            hideInlineToolbar();
          }
        }
        if (e.data.type === 'DECKFORGE_SHOW_PAGE') {
          showSlide(e.data.index);
        }
        if (e.data.type === 'DECKFORGE_REQUEST_HTML') {
          try {
            window.parent.postMessage({
              type: 'DECKFORGE_HTML_RESPONSE',
              requestId: e.data.requestId,
              html: serializeDocument(),
            }, '*');
          } catch (err) {
            console.error('Serialize HTML failed:', err);
          }
        }
        if (e.data.type === 'DECKFORGE_UNDO') { doUndo(); }
        if (e.data.type === 'DECKFORGE_REDO') { doRedo(); }
        if (e.data.type === 'DECKFORGE_DELETE_SELECTED') { deleteSelectedElements(); }
        if (e.data.type === 'DECKFORGE_COPY_SELECTED') { copySelectedElement(); }
        if (e.data.type === 'DECKFORGE_PASTE_ELEMENT') { pasteClipboardElement(); }
        if (e.data.type === 'DECKFORGE_DUPLICATE_SELECTED') { duplicateSelectedElement(); }
        if (e.data.type === 'DECKFORGE_INSERT_ELEMENT') { insertElement(e.data.kind); }
        if (e.data.type === 'DECKFORGE_ALIGN') { alignSelection(e.data.mode); }
        if (e.data.type === 'DECKFORGE_INSERT_SLIDE') { insertSlideAfter(e.data.index); }
        if (e.data.type === 'DECKFORGE_DUPLICATE_SLIDE') { duplicateSlide(e.data.index); }
        if (e.data.type === 'DECKFORGE_DELETE_SLIDE') { deleteSlide(e.data.index); }
        if (e.data.type === 'DECKFORGE_MOVE_SLIDE') { moveSlide(e.data.from, e.data.to); }
        if (e.data.type === 'DECKFORGE_SET_SLIDE_LOCK') {
          var lockIndex = Number(e.data.index);
          if (Number.isInteger(lockIndex)) {
            if (e.data.locked) agentLockedSlides.add(lockIndex);
            else agentLockedSlides.delete(lockIndex);
            updateAgentLockOverlay();
          }
        }
        if (e.data.type === 'DECKFORGE_EXPORT_SLIDE') {
          var exportSlide = allSlides[e.data.index];
          var exportHtml = '';
          var exportSelected = null;
          if (exportSlide) {
            // 把当前选中元素临时打上标记再克隆，让 AI 知道「这里 / 选中的部分」指什么；
            // 标记与还原是同步的，不会产生可见闪烁。
            var liveSelected = selectedElement && exportSlide.contains(selectedElement) ? selectedElement : null;
            if (liveSelected) {
              liveSelected.setAttribute('data-deckforge-selected', '1');
              exportSelected = {
                tag: liveSelected.tagName.toLowerCase(),
                text: liveSelected.textContent ? String(liveSelected.textContent).trim().substring(0, 60) : '',
              };
            }
            try {
              if (exportSlide === document.body) {
                var bodyClone = exportSlide.cloneNode(true);
                var junk = bodyClone.querySelector('#__deckforge-agent-lock, #__deckforge-selection-layer, #__deckforge-context-menu, #__deckforge-rt-toolbar');
                if (junk) junk.remove();
                exportHtml = bodyClone.innerHTML;
              } else {
                exportHtml = exportSlide.innerHTML;
              }
            } finally {
              if (liveSelected) liveSelected.removeAttribute('data-deckforge-selected');
            }
          }
          window.parent.postMessage({
            type: 'DECKFORGE_SLIDE_EXPORT',
            requestId: e.data.requestId,
            html: exportHtml,
            width: exportSlide ? exportSlide.getBoundingClientRect().width : 0,
            height: exportSlide ? exportSlide.getBoundingClientRect().height : 0,
            selected: exportSelected,
          }, '*');
        }
        if (e.data.type === 'DECKFORGE_REPLACE_SLIDE') {
          var replaceSlide = allSlides[e.data.index];
          if (replaceSlide && typeof e.data.html === 'string' && e.data.html.trim()) {
            pushHistory(); // AI / 批量替换同样可撤销
            clearSelection();
            replaceSlide.innerHTML = e.data.html;
            postSelectionCleared();
          }
        }
        if (e.data.type === 'DECKFORGE_APPLY_STYLE') {
          var styleTarget = document.querySelector(e.data.selector);
          if (styleTarget) {
            pushHistory();
            styleTarget.style[e.data.property] = e.data.value;
          }
        }
        if (e.data.type === 'DECKFORGE_APPLY_MULTIPLE_STYLES') {
          var multiTarget = document.querySelector(e.data.selector);
          if (multiTarget && e.data.styles) {
            pushHistory();
            for (var styleKey in e.data.styles) {
              if (Object.prototype.hasOwnProperty.call(e.data.styles, styleKey)) {
                multiTarget.style[styleKey] = e.data.styles[styleKey];
              }
            }
          }
        }
        if (e.data.type === 'DECKFORGE_APPLY_TEXT') {
          var textTarget = document.querySelector(e.data.selector);
          if (textTarget) {
            pushHistory();
            textTarget.textContent = e.data.text;
          }
        }
        if (e.data.type === 'DECKFORGE_REPLACE_IMAGE') {
          var imgTarget = document.querySelector(e.data.selector);
          if (imgTarget && imgTarget.tagName.toLowerCase() === 'img') {
            pushHistory();
            imgTarget.src = e.data.imageData;
          }
        }
        if (e.data.type === 'DECKFORGE_REPLACE_HTML') {
          var htmlTarget = document.querySelector(e.data.selector);
          if (htmlTarget) {
            try {
              pushHistory();
              var wrapper = document.createElement('div');
              wrapper.innerHTML = e.data.html;
              var newEl = wrapper.firstElementChild || wrapper;
              htmlTarget.replaceWith(newEl);
            } catch (err) {
              console.error('Replace HTML failed:', err);
            }
          }
        }
      });

      document.addEventListener('selectionchange', function() {
        if (multiSelection.length) {
          var stillValid = multiSelection.filter(function(el) { return document.contains(el); });
          if (stillValid.length !== multiSelection.length) {
            if (stillValid.length === 0) {
              clearSelection();
              postSelectionCleared();
            } else {
              setSelection(stillValid);
            }
          }
        }
      });

      // 初始化：查找所有 slides，默认显示第一个
      findAllSlides();
      captureOriginalSlideStates();
      showSlide(0);
      notifyHistory();
      notifySlidesChanged();
    })();
  `;
}

/**
 * 为 iframe 注入编辑桥接脚本
 */
export function injectEditorBridge(iframe: HTMLIFrameElement): void {
  if (!iframe.contentWindow || !iframe.contentDocument) return;

  const script = iframe.contentDocument.createElement('script');
  script.id = '__deckforge-bridge';
  script.textContent = createEditorBridgeScript();
  iframe.contentDocument.head.appendChild(script);
}
