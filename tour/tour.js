/**
 * Inventory Tiles Tour — engine.
 *
 * Loads on each step-N[-uk][-light].html page. Detects theme + language from
 * URL pathname suffix, reads `?step=N`, renders mask + spotlight + tooltip.
 *
 * Theme toggle is bound to existing header button #4. Language toggle is bound
 * to existing flag dropdown trigger in the header. Defaults: lang=en, theme=light.
 */

(function () {
  'use strict';

  const STEPS = window.TOUR_STEPS || [];
  if (STEPS.length === 0) {
    console.warn('[tour] TOUR_STEPS not loaded');
    return;
  }
  const I18N = (window.TOUR_I18N || {});

  // ── Variant detection (theme + language) from URL path ──────────────
  // Pattern: step-N[-uk][-light][.html]  (Cloudflare Pages обрезает .html → делаем его опциональным)
  const pathMatch = window.location.pathname.match(/(step-\d+)(-uk)?(-light)?(?:\.html)?$/);
  const isLightTheme = !!(pathMatch && pathMatch[3]);
  const lang = (pathMatch && pathMatch[2]) ? 'uk' : 'en';
  const _initialParams = new URLSearchParams(window.location.search);

  // Defaults: light + en. Если URL без -light suffix и пользователь явно
  // не выбирал dark (через toggle), редиректим на -light версию.
  if (pathMatch && !isLightTheme && localStorage.getItem('tour-theme') !== 'dark') {
    const target = pathMatch[1] + (pathMatch[2] || '') + '-light.html';
    const url = new URL(target, window.location.href);
    _initialParams.forEach(function (v, k) { url.searchParams.set(k, v); });
    window.location.replace(url.toString());
    return;
  }

  // Persist user choice — index.html учитывает при следующем заходе.
  localStorage.setItem('tour-theme', isLightTheme ? 'light' : 'dark');
  localStorage.setItem('tour-lang', lang);

  // i18n shortcut + safe fallbacks.
  const t = I18N[lang] || I18N.en || { welcome: {}, steps: [], final: {}, btn: {} };
  const tStep = function (idx) {
    if (idx === 0) return t.welcome || {};
    return (t.steps && t.steps[idx - 1]) || {};
  };
  const tBtn = t.btn || {};

  function pageForVariant(pageName) {
    // pageName в STEPS канонически 'step-N.html' (без суффиксов).
    const base = pageName.replace(/\.html$/, '');
    let suffix = '';
    if (lang !== 'en') suffix += '-' + lang;
    if (isLightTheme) suffix += '-light';
    return base + suffix + '.html';
  }

  function applyVariantToPath(to) {
    // Заменяет step-N[-uk][-light].html в строке `to` на текущий вариант,
    // сохраняя ?query, если он есть.
    return to.replace(/(step-\d+)((?:-uk)?(?:-light)?)(?:\.html)?(?=\?|#|$|\/)/, function (m, base) {
      let s = '';
      if (lang !== 'en') s += '-' + lang;
      if (isLightTheme) s += '-light';
      return base + s + '.html';
    });
  }

  // ── Bind theme + language toggles on existing header controls ───────
  bindThemeToggle();
  bindLangToggle();

  // ── Read current step from URL ──────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const requestedStep = parseInt(params.get('step') ?? '0', 10);
  const currentIdx = isNaN(requestedStep) ? 0 : Math.max(0, Math.min(STEPS.length - 1, requestedStep));
  const step = STEPS[currentIdx];

  // ── Welcome screen (step.welcome === true) ─────────────────────────
  // Welcome показываем ВСЕГДА на step-0 — даже если в этой сессии браузера
  // юзер уже закрывал тур (иначе шейр-ссылка на welcome молча уходит в demo).
  if (step.welcome) {
    sessionStorage.removeItem('tour-closed');
    const welcomeText = t.welcome || {};
    const welcome = document.createElement('div');
    welcome.className = 'tour-final';
    welcome.innerHTML = `
      <div class="tour-final__card">
        <div class="tour-final__icon" aria-hidden="true">▶</div>
        <h2 class="tour-final__title"></h2>
        <p class="tour-final__body"></p>
        <input type="email" class="tour-final__email" autocomplete="email" required />
        <div class="tour-final__legal">
          <a href="#" class="tour-final__legal-link" data-legal="privacy"></a>
          <span class="tour-final__legal-sep"></span>
          <a href="#" class="tour-final__legal-link" data-legal="cookie"></a>
        </div>
        <div class="tour-final__actions">
          <button class="tour-final__btn" data-action="start" disabled></button>
        </div>
      </div>
    `;
    welcome.querySelector('.tour-final__title').textContent = welcomeText.title || '';
    welcome.querySelector('.tour-final__body').textContent = welcomeText.body || '';
    const emailInput = welcome.querySelector('.tour-final__email');
    emailInput.placeholder = welcomeText.emailPlaceholder || '';
    const startBtn = welcome.querySelector('[data-action="start"]');
    startBtn.textContent = tBtn.start || 'Start tour';
    // Privacy / Cookie ссылки и overlay-ы.
    const legalLinks = welcome.querySelectorAll('.tour-final__legal-link');
    legalLinks[0].textContent = welcomeText.privacyLink || 'Privacy Policy';
    legalLinks[0].setAttribute('data-legal', 'privacy');
    legalLinks[1].textContent = welcomeText.cookieLink || 'Cookie Policy';
    legalLinks[1].setAttribute('data-legal', 'cookie');
    welcome.querySelector('.tour-final__legal-sep').textContent = welcomeText.legalSeparator || ' · ';
    legalLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openLegalOverlay(link.getAttribute('data-legal'));
      });
    });
    function openLegalOverlay(kind) {
      const titleKey = kind === 'cookie' ? 'cookieTitle' : 'privacyTitle';
      const bodyKey  = kind === 'cookie' ? 'cookieBody'  : 'privacyBody';
      const ov = document.createElement('div');
      ov.className = 'tour-legal';
      ov.innerHTML = `
        <div class="tour-legal__card">
          <button class="tour-legal__close" aria-label="Close">×</button>
          <h3 class="tour-legal__title"></h3>
          <div class="tour-legal__body"></div>
        </div>
      `;
      ov.querySelector('.tour-legal__title').textContent = welcomeText[titleKey] || '';
      ov.querySelector('.tour-legal__body').innerHTML = welcomeText[bodyKey] || '';
      function close() { ov.remove(); document.removeEventListener('keydown', onKey, true); }
      function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
      ov.querySelector('.tour-legal__close').addEventListener('click', close);
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(ov);
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function syncStartState() {
      startBtn.disabled = !emailRe.test(emailInput.value.trim());
    }
    emailInput.addEventListener('input', syncStartState);
    document.body.appendChild(welcome);
    setTimeout(function () { emailInput.focus(); }, 50);
    function startTour() {
      if (startBtn.disabled) return;
      const email = emailInput.value.trim();
      try { localStorage.setItem('tour-email', email); } catch (e) {}
      // Отправляем заявку на ceo@amzwork.space через Formsubmit.co.
      // Fire-and-forget: не блокируем переход на step-1 — если запрос
      // упадёт, юзер всё равно зайдёт в тур, а ошибка осядет в console.
      try {
        fetch('https://formsubmit.co/ajax/ceo@amzwork.space', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            email: email,
            language: lang,
            theme: isLightTheme ? 'light' : 'dark',
            _subject: 'Demo request from seller.exchange tour',
            _template: 'table',
            _captcha: 'false',
          }),
        }).catch(function (e) { console.warn('[tour] Formsubmit POST failed:', e); });
      } catch (e) { console.warn('[tour] Formsubmit init failed:', e); }
      const url = new URL(pageForVariant(STEPS[1].page), window.location.href);
      url.searchParams.set('step', '1');
      window.location.href = url.toString();
    }
    startBtn.addEventListener('click', startTour);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === 'ArrowRight') startTour();
    });
    return;
  }

  // ── Demo mode (после close или при ?demo=1) ─────────────────────────
  const isDemoMode = sessionStorage.getItem('tour-closed') === '1' || params.get('demo') === '1';
  if (isDemoMode) {
    installDemoHandlers();
    showReopenButtonStandalone();
    return;
  }

  // ── Build DOM nodes ─────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'tour-root';

  const mask = document.createElement('div');
  mask.className = 'tour-mask';

  const spotlight = document.createElement('div');
  spotlight.className = 'tour-spotlight';

  const tooltip = document.createElement('div');
  tooltip.className = 'tour-tooltip';
  tooltip.innerHTML = `
    <button class="tour-tooltip__close" aria-label="Close tour">×</button>
    <h3 class="tour-tooltip__title"></h3>
    <p class="tour-tooltip__body"></p>
    <div class="tour-tooltip__footer">
      <div class="tour-tooltip__progress">
        <span class="tour-tooltip__progress-text"></span>
        <span class="tour-tooltip__dots"></span>
      </div>
      <div class="tour-tooltip__nav">
        <button class="tour-btn" data-action="prev"></button>
        <button class="tour-btn tour-btn--primary" data-action="next"></button>
      </div>
    </div>
  `;

  // Optional PNG overlay (для динамических состояний, отсутствующих в MHTML).
  let overlayImg = null;
  if (step.overlay) {
    overlayImg = document.createElement('img');
    overlayImg.src = isLightTheme
      ? step.overlay.src.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '-light.$1')
      : step.overlay.src;
    overlayImg.alt = '';
    overlayImg.className = 'tour-overlay-img';
    overlayImg.style.position = 'fixed';
    overlayImg.style.zIndex = '10000';
    overlayImg.style.width = step.overlay.w + 'px';
    overlayImg.style.height = step.overlay.h + 'px';
    overlayImg.style.pointerEvents = 'none';
    overlayImg.style.borderRadius = '8px';
    if (typeof step.overlay.x === 'number') overlayImg.style.left = step.overlay.x + 'px';
    if (typeof step.overlay.y === 'number') overlayImg.style.top = step.overlay.y + 'px';
    root.appendChild(overlayImg);
  }

  root.appendChild(mask);
  if (step.spotlight) {
    root.appendChild(spotlight);
  } else {
    mask.classList.add('tour-mask--no-spotlight');
  }
  root.appendChild(tooltip);
  document.body.appendChild(root);

  // ── Fill content ────────────────────────────────────────────────────
  const stepText = tStep(currentIdx);
  tooltip.querySelector('.tour-tooltip__title').textContent = stepText.title || '';
  tooltip.querySelector('.tour-tooltip__body').textContent = stepText.body || '';

  // Прогресс — счётчик «N/Total» (welcome не считаем, поэтому total = STEPS.length-1).
  const progressText = tooltip.querySelector('.tour-tooltip__progress-text');
  progressText.textContent = currentIdx + '/' + (STEPS.length - 1);

  const prevBtn = tooltip.querySelector('[data-action="prev"]');
  const nextBtn = tooltip.querySelector('[data-action="next"]');
  prevBtn.disabled = currentIdx === 0;
  prevBtn.textContent = tBtn.back || 'Back';
  nextBtn.textContent = (currentIdx === STEPS.length - 1)
    ? (tBtn.finish || 'Finish')
    : (tBtn.next || 'Next');

  tooltip.querySelector('.tour-tooltip__close').setAttribute('aria-label', tBtn.closeTour || 'Close tour');

  // ── Position spotlight & tooltip ────────────────────────────────────
  function rectFromSelector(sel) {
    if (!sel) return null;
    const el = (typeof sel === 'string') ? document.querySelector(sel) : sel;
    if (!el || !el.getBoundingClientRect) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  function unionRects(rects) {
    const xs = rects.map(r => r.x);
    const ys = rects.map(r => r.y);
    const xe = rects.map(r => r.x + r.w);
    const ye = rects.map(r => r.y + r.h);
    const x = Math.min.apply(null, xs);
    const y = Math.min.apply(null, ys);
    return { x, y, w: Math.max.apply(null, xe) - x, h: Math.max.apply(null, ye) - y };
  }
  function resolveSpotlight(s) {
    if (!s) return null;
    if (Array.isArray(s)) {
      const rects = s.map(resolveSpotlight).filter(Boolean);
      return rects.length ? unionRects(rects) : null;
    }
    if (typeof s === 'string') return rectFromSelector(s);
    return s;
  }

  // Steps 5/12 — popover в snapshot’е либо display:none, либо позиционирован
  // через bottom: NNN от высоты body (она в HTML-снимке непредсказуема,
  // поэтому при текущем viewport-е элемент уезжает за пределы экрана).
  // В dark step-11.html присутствует ещё один inline-popover внутри
  // `.as-inline-popover` плитки — его пропускаем (position:fixed внутри
  // .sliderTrack с inline transform-ом ломает viewport-координаты), плюс
  // скрываем, чтобы не было двух поповеров одновременно. Якорим body-level.
  function fixPopoverIfNeeded() {
    if (!step.popoverFix) return;
    // Прячем inline-popover-ы (актуально для dark step-11.html).
    document.querySelectorAll('.as-inline-popover').forEach(function (el) {
      el.style.display = 'none';
    });
    // Берём первый popover, который НЕ внутри inline-обёртки = body-level.
    let pop = null;
    document.querySelectorAll('.ant-popover-placement-top').forEach(function (p) {
      if (!pop && !p.closest('.as-inline-popover')) pop = p;
    });
    if (!pop) return;
    pop.style.display = 'block';
    pop.style.position = 'fixed';
    pop.style.inset = '';
    pop.style.right = '';
    pop.style.bottom = '';
    // Сначала ставим в безопасную точку, затем измеряем размер и якорим.
    pop.style.left = '-9999px';
    pop.style.top = '0px';
    requestAnimationFrame(function () {
      const anchor = step.popoverFix.anchor
        ? document.querySelector(step.popoverFix.anchor)
        : null;
      const popR = pop.getBoundingClientRect();
      if (anchor) {
        const r = anchor.getBoundingClientRect();
        const left = Math.max(12, Math.min(window.innerWidth - popR.width - 12,
          r.left + r.width / 2 - popR.width / 2));
        const top = Math.max(12, r.top - popR.height - 12);
        pop.style.left = left + 'px';
        pop.style.top = top + 'px';
      } else {
        pop.style.left = (step.popoverFix.left || 400) + 'px';
        pop.style.top = (step.popoverFix.top || 220) + 'px';
      }
      position();
    });
  }

  // Step 4 — позиция .ant-dropdown в snapshot’е захардкожена (`inset: 104px
  // auto auto 791px`). При viewport < 1600px кнопка-триггер «уезжает» влево,
  // а dropdown остаётся на 791px → визуальный разрыв. Перепривязываем dropdown
  // под триггер.
  function fixDropdownIfNeeded() {
    if (!step.dropdownFix) return;
    const dropdown = document.querySelector('.ant-dropdown');
    const trigger = step.dropdownFix.anchor
      ? document.querySelector(step.dropdownFix.anchor)
      : null;
    if (!dropdown || !trigger) return;
    const tr = trigger.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.inset = '';
    dropdown.style.right = '';
    dropdown.style.bottom = '';
    dropdown.style.top = (tr.bottom + 4) + 'px';
    dropdown.style.left = tr.left + 'px';
  }

  // Step 11 — дополнительно подсвеченные элементы (помимо основного spotlight).
  // Обводим целевой элемент через outline и поднимаем z-index НА КОРНЕВОМ
  // positioned-предке (последний positioned-элемент до body) — иначе boost
  // окажется внутри stacking context-а .ant-popover (z:1030) и не перебьёт
  // dim-слой spotlight-а (z:9999).
  function applyExtraHighlights() {
    if (!step.extraHighlights) return;
    step.extraHighlights.forEach(function (sel) {
      const el = document.querySelector(sel);
      if (!el) return;
      el.style.outline = '2px solid #007bff';
      el.style.outlineOffset = '0px';
      let zEl = null;
      let cur = el;
      while (cur && cur !== document.body) {
        const pos = window.getComputedStyle(cur).position;
        if (pos && pos !== 'static') zEl = cur;
        cur = cur.parentElement;
      }
      (zEl || el).style.zIndex = '10001';
    });
  }

  // Steps 15/16 — в snapshot’е `.ant-modal` зафиксирован inline-стилем
  // `left: 584.859px; top: 141.844px` (под viewport ~1920px). На других
  // экранах модалка уезжает вбок — переcчитываем центр под текущий viewport.
  function centerModalIfNeeded() {
    if (!step.centerModal) return;
    const modal = document.querySelector(step.centerModal);
    if (!modal) return;
    const r = modal.getBoundingClientRect();
    const w = r.width || parseFloat(modal.style.width) || 800;
    const h = r.height || 600;
    modal.style.position = 'fixed';
    modal.style.margin = '0';
    modal.style.left = Math.max(20, (window.innerWidth - w) / 2) + 'px';
    modal.style.top = Math.max(20, (window.innerHeight - h) / 2) + 'px';
  }

  // Step 11 — popover с метриками в snapshot’е стоит на фиксированной
  // позиции (`inset: 0px auto auto 803px`). Pin его ко 2-й плитке слайдера,
  // чтобы попап стоял рядом со «своей» плиткой при любом viewport-е.
  function pinPopoverIfNeeded() {
    if (!step.pinPopover) return;
    const pop = document.querySelector(step.pinPopover.selector);
    const anchor = document.querySelector(step.pinPopover.anchor);
    if (!pop || !anchor) return;
    pop.style.position = 'fixed';
    pop.style.inset = '';
    pop.style.right = '';
    pop.style.bottom = '';
    pop.style.left = '-9999px';
    pop.style.top = '0px';
    requestAnimationFrame(function () {
      const ar = anchor.getBoundingClientRect();
      const pr = pop.getBoundingClientRect();
      const placement = step.pinPopover.placement || 'right';
      const gap = step.pinPopover.gap == null ? 12 : step.pinPopover.gap;
      let x = 0, y = 0;
      switch (placement) {
        case 'right': x = ar.right + gap;            y = ar.top; break;
        case 'left':  x = ar.left - pr.width - gap;  y = ar.top; break;
        case 'top':   x = ar.left;                    y = ar.top - pr.height - gap; break;
        case 'bottom':x = ar.left;                    y = ar.bottom + gap; break;
      }
      // Clamp в viewport.
      x = Math.max(12, Math.min(window.innerWidth - pr.width - 12, x));
      y = Math.max(12, Math.min(window.innerHeight - pr.height - 12, y));
      pop.style.left = x + 'px';
      pop.style.top = y + 'px';
      position();
    });
  }

  function position() {
    const sp = resolveSpotlight(step.spotlight);
    if (sp) {
      spotlight.style.left = sp.x + 'px';
      spotlight.style.top = sp.y + 'px';
      spotlight.style.width = sp.w + 'px';
      spotlight.style.height = sp.h + 'px';
      spotlight.style.border = '';
      spotlight.style.borderRadius = '';
    }

    if (overlayImg && step.overlay && step.overlay.anchor === 'spotlight-below' && sp) {
      // Позиционируем overlay и расширяем spotlight, чтобы рамка обняла и
      // триггер, и сам overlay (datepicker + calendar) — без зазора.
      overlayImg.style.left = sp.x + 'px';
      overlayImg.style.top = (sp.y + sp.h + 4) + 'px';
      spotlight.style.left = sp.x + 'px';
      spotlight.style.top = sp.y + 'px';
      spotlight.style.width = Math.max(sp.w, step.overlay.w) + 'px';
      spotlight.style.height = (sp.h + 4 + step.overlay.h) + 'px';
    }

    const tt = step.tooltip || {};
    const tipRect = tooltip.getBoundingClientRect();

    // Горизонтальный «якорь» tooltip-а: либо отдельный селектор, либо
    // union(spotlight + overlay) для шагов с overlay снизу, либо сам spotlight.
    let anchor = sp;
    if (tt.anchorSelector) {
      const a = rectFromSelector(tt.anchorSelector);
      if (a) anchor = a;
    } else if (overlayImg && step.overlay && step.overlay.anchor === 'spotlight-below' && sp) {
      anchor = {
        x: sp.x,
        y: sp.y,
        w: Math.max(sp.w, step.overlay.w),
        h: sp.h + 4 + step.overlay.h,
      };
    }

    // Вертикальный якорь — отдельно, если задан (для placement 'left-above'/'right-above').
    let vAnchor = anchor;
    if (tt.vAnchorSelector) {
      const v = rectFromSelector(tt.vAnchorSelector);
      if (v) vAnchor = v;
    }

    let x = 0, y = 0;
    if (tt.placement === 'center' || !sp) {
      x = (window.innerWidth - tipRect.width) / 2;
      y = (window.innerHeight - tipRect.height) / 2;
    } else {
      const ox = tt.offsetX || 0;
      const oy = tt.offsetY || 0;
      switch (tt.placement) {
        case 'top':         x = anchor.x + anchor.w / 2 - tipRect.width / 2;  y = anchor.y - tipRect.height - 12 + oy; break;
        case 'top-end':     x = anchor.x + anchor.w - tipRect.width;           y = anchor.y - tipRect.height - 12 + oy; break;
        case 'bottom':      x = anchor.x + anchor.w / 2 - tipRect.width / 2;  y = anchor.y + anchor.h + 12 + oy; break;
        case 'bottom-end':  x = anchor.x + anchor.w - tipRect.width;           y = anchor.y + anchor.h + 12 + oy; break;
        case 'left':        x = anchor.x - tipRect.width - 12 + ox;            y = anchor.y + anchor.h / 2 - tipRect.height / 2 + oy; break;
        case 'right':       x = anchor.x + anchor.w + 12 + ox;                  y = anchor.y + anchor.h / 2 - tipRect.height / 2 + oy; break;
        case 'left-above':  // x: слева от anchor, y: над vAnchor (низ tooltip’а над верхом vAnchor)
          x = anchor.x - tipRect.width - 12 + ox;
          y = vAnchor.y - tipRect.height - 12 + oy;
          break;
        case 'right-above':
          x = anchor.x + anchor.w + 12 + ox;
          y = vAnchor.y - tipRect.height - 12 + oy;
          break;
        default:            x = anchor.x + anchor.w + 12;                      y = anchor.y;
      }
    }

    x = Math.max(12, Math.min(window.innerWidth - tipRect.width - 12, x));
    y = Math.max(12, Math.min(window.innerHeight - tipRect.height - 12, y));

    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';

    // Объединяем cutout spotlight-а с областью tooltip-а — общая «подсветка»
    // на тех шагах, где это нужно по сценарию.
    if (step.spotlightWithTooltip && sp) {
      const xleft = Math.min(sp.x, x);
      const ytop = Math.min(sp.y, y);
      const xright = Math.max(sp.x + sp.w, x + tipRect.width);
      const ybottom = Math.max(sp.y + sp.h, y + tipRect.height);
      spotlight.style.left = xleft + 'px';
      spotlight.style.top = ytop + 'px';
      spotlight.style.width = (xright - xleft) + 'px';
      spotlight.style.height = (ybottom - ytop) + 'px';
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────
  function goTo(idx) {
    if (idx < 0 || idx >= STEPS.length) return;
    const target = STEPS[idx];
    const url = new URL(pageForVariant(target.page), window.location.href);
    url.searchParams.set('step', String(idx));
    window.location.href = url.toString();
  }

  function next() {
    if (currentIdx >= STEPS.length - 1) showFinal();
    else goTo(currentIdx + 1);
  }
  function prev() { goTo(currentIdx - 1); }
  function close() {
    document.body.classList.add('tour-closed');
    sessionStorage.setItem('tour-closed', '1');
    setTimeout(() => root.remove(), 200);
    showReopenButton();
    installDemoHandlers();
  }

  function showReopenButton() {
    if (document.querySelector('.tour-reopen-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tour-reopen-btn';
    btn.textContent = tBtn.openTour || 'Open tour';
    btn.addEventListener('click', function () {
      sessionStorage.removeItem('tour-closed');
      const url = new URL(window.location.href);
      url.searchParams.set('step', String(currentIdx));
      url.searchParams.delete('demo');
      window.location.href = url.toString();
    });
    document.body.appendChild(btn);
  }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  tooltip.querySelector('.tour-tooltip__close').addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  });

  window.addEventListener('resize', position);

  // ── Final screen ────────────────────────────────────────────────────
  function showFinal() {
    // Скрываем mask/spotlight/tooltip последнего шага — на Completed-экране
    // должна остаться только Final-карточка.
    if (root && root.parentNode) root.style.display = 'none';
    const final = document.createElement('div');
    final.className = 'tour-final';
    final.innerHTML = `
      <div class="tour-final__card">
        <div class="tour-final__icon">✓</div>
        <h2 class="tour-final__title"></h2>
        <p class="tour-final__body"></p>
        <div class="tour-final__actions">
          <button class="tour-final__btn tour-final__btn--ghost" data-action="restart"></button>
          <button class="tour-final__btn tour-final__btn--ghost" data-action="close"></button>
          <a class="tour-final__btn" href="https://seller.exchange"></a>
        </div>
      </div>
    `;
    final.querySelector('.tour-final__title').textContent = (t.final && t.final.title) || 'Tour Completed';
    final.querySelector('.tour-final__body').textContent = '';  // body не задан в txt → оставляем пусто
    final.querySelector('[data-action="restart"]').textContent = tBtn.restart || 'Start again';
    final.querySelector('[data-action="close"]').textContent = tBtn.closeTour || 'Close tour';
    final.querySelector('a.tour-final__btn').textContent = tBtn.returnSite || 'Return to the website';
    document.body.appendChild(final);
    final.querySelector('[data-action="restart"]').addEventListener('click', function () { goTo(0); });
    final.querySelector('[data-action="close"]').addEventListener('click', function () {
      sessionStorage.setItem('tour-closed', '1');
      final.remove();
      if (root && root.parentNode) root.remove();
      installDemoHandlers();
      showReopenButtonStandalone();
    });
  }

  // Initial render
  fixPopoverIfNeeded();
  fixDropdownIfNeeded();
  pinPopoverIfNeeded();
  centerModalIfNeeded();
  applyExtraHighlights();
  requestAnimationFrame(position);
  setTimeout(position, 50);

  // ── Demo-mode click handlers ───────────────────────────────────────
  function installDemoHandlers() {
    if (document.body.dataset.demoHandlers === '1') return;
    document.body.dataset.demoHandlers = '1';

    function nav(to) { window.location.href = new URL(applyVariantToPath(to), window.location.href).toString(); }
    function bind(el, handler) {
      if (!el) return;
      el.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); handler(e);
      }, true);
    }

    document.querySelectorAll('button[class*="-buttonSettings"]').forEach(function (btn) {
      bind(btn, function () { nav('step-9.html?step=15'); });
    });
    document.querySelectorAll('button[class*="-showTilesButtonActive"]').forEach(function (btn) {
      bind(btn, function () { nav('step-0.html'); });
    });
    document.querySelectorAll('[class*="-showTilesButton"]').forEach(function (btn) {
      if (btn.className && btn.className.indexOf('Active') !== -1) return;
      bind(btn, function () { nav('step-1.html'); });
    });
    function currentStepBase() {
      const m = window.location.pathname.match(/step-(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    }

    const presetsBtn = document.querySelector('main [class*="-flexRow"] [class*="-spaceCompact"] > div > button');
    if (presetsBtn) bind(presetsBtn, function () {
      // Toggle: на step-8 → возвращаемся на step-1, иначе открываем step-8.
      nav(currentStepBase() === 8 ? 'step-1.html' : 'step-8.html');
    });

    const datepicker = document.querySelector('main [class*="-flexRow"] > div:nth-child(3)');
    if (datepicker) bind(datepicker, function () { toggleDatepickerOverlay(datepicker); });

    document.querySelectorAll('[class*="-sliderTrack"] button, [class*="-sliderTrack"] > div > div button').forEach(function (btn) {
      const text = (btn.textContent || '').trim();
      const svg = btn.querySelector('svg path');
      const d = svg ? (svg.getAttribute('d') || '') : '';
      const isKebab = d.indexOf('M255.8 218') !== -1;
      if (isKebab) bind(btn, function () { nav('step-9.html'); });
      else if (text === 'More' || text === 'Детальніше' || text === 'Подробнее') bind(btn, function () {
        // Toggle: на step-7 (popover уже открыт) → возврат на step-1.
        nav(currentStepBase() === 7 ? 'step-1.html' : 'step-7.html');
      });
    });

    document.querySelectorAll('.ant-modal-content .ant-radio-button-label').forEach(function (label) {
      const opt = label.querySelector('[class*="-option"]') || label;
      const text = opt.textContent.trim();
      if (text !== 'Metrics' && text !== 'Метрики' && text !== 'More' && text !== 'Детальніше' && text !== 'Більше') return;
      const goMore = (text === 'More' || text === 'Детальніше' || text === 'Більше');
      bind(label, function () { nav(goMore ? 'step-10.html' : 'step-9.html'); });
    });

    document.querySelectorAll('.ant-modal-content .ant-modal-close').forEach(function (cl) {
      bind(cl, function () { nav('step-1.html'); });
    });
  }

  function toggleDatepickerOverlay(anchor) {
    const existing = document.querySelector('.demo-picker-overlay');
    if (existing) { existing.remove(); return; }
    const r = anchor.getBoundingClientRect();
    const img = document.createElement('img');
    img.src = isLightTheme ? 'PickerDropdown-light.png' : 'PickerDropdown.png';
    img.className = 'demo-picker-overlay';
    img.style.cssText =
      'position:fixed;left:' + r.left + 'px;top:' + (r.bottom + 4) + 'px;' +
      'width:787px;height:392px;z-index:10000;' +
      'border-radius:8px;cursor:pointer;';
    img.addEventListener('click', function (e) { e.stopPropagation(); img.remove(); });
    document.body.appendChild(img);
    setTimeout(function () {
      function outside(ev) {
        if (!img.contains(ev.target) && ev.target !== anchor && !anchor.contains(ev.target)) {
          img.remove();
          document.removeEventListener('click', outside, true);
        }
      }
      document.addEventListener('click', outside, true);
    }, 50);
  }

  // ── Header controls (theme + lang) ──────────────────────────────────
  function bindThemeToggle() {
    function tryBind() {
      const btn = document.querySelector('#root .ant-layout > header > div > button:nth-child(4)');
      if (!btn || btn.dataset.tourThemeBound === '1') return !!btn;
      btn.dataset.tourThemeBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); toggleTheme();
      }, true);
      return true;
    }
    if (!tryBind()) { window.addEventListener('DOMContentLoaded', tryBind); setTimeout(tryBind, 100); }
  }

  function bindLangToggle() {
    function tryBind() {
      const flag = document.querySelector('#root .ant-layout > header > div img.ant-dropdown-trigger[class*="-flag"]');
      if (!flag || flag.dataset.tourLangBound === '1') return !!flag;
      flag.dataset.tourLangBound = '1';
      flag.style.cursor = 'pointer';
      flag.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); toggleLanguage();
      }, true);
      // Также интерсепт нажатия на родительский dropdown-wrapper, если он сам ловит клик.
      const wrap = flag.closest('[class*="dropdown"]') || flag.parentElement;
      if (wrap && wrap !== flag && wrap.dataset.tourLangBound !== '1') {
        wrap.dataset.tourLangBound = '1';
        wrap.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation(); toggleLanguage();
        }, true);
      }
      return true;
    }
    if (!tryBind()) { window.addEventListener('DOMContentLoaded', tryBind); setTimeout(tryBind, 100); }
  }

  function toggleTheme() {
    const m = window.location.pathname.match(/(step-\d+)(-uk)?(-light)?(?:\.html)?$/);
    if (!m) return;
    const stepBase = m[1], langSuf = m[2] || '', isLightCur = !!m[3];
    const newLightSuf = isLightCur ? '' : '-light';
    const target = stepBase + langSuf + newLightSuf + '.html';
    localStorage.setItem('tour-theme', isLightCur ? 'dark' : 'light');
    const url = new URL(target, window.location.href);
    params.forEach(function (v, k) { url.searchParams.set(k, v); });
    window.location.href = url.toString();
  }

  function toggleLanguage() {
    const m = window.location.pathname.match(/(step-\d+)(-uk)?(-light)?(?:\.html)?$/);
    if (!m) return;
    const stepBase = m[1], isUkCur = !!m[2], lightSuf = m[3] || '';
    const newLangSuf = isUkCur ? '' : '-uk';
    const target = stepBase + newLangSuf + lightSuf + '.html';
    localStorage.setItem('tour-lang', isUkCur ? 'en' : 'uk');
    const url = new URL(target, window.location.href);
    params.forEach(function (v, k) { url.searchParams.set(k, v); });
    window.location.href = url.toString();
  }

  function showReopenButtonStandalone() {
    if (document.querySelector('.tour-reopen-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tour-reopen-btn';
    btn.textContent = tBtn.openTour || 'Open tour';
    btn.addEventListener('click', function () {
      sessionStorage.removeItem('tour-closed');
      // Сохраняем текущий вариант (theme + lang) при возврате на welcome.
      window.location.href = pageForVariant('step-0.html') + '?step=0';
    });
    document.body.appendChild(btn);
  }

})();
