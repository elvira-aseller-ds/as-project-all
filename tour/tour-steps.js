/**
 * Inventory Tiles Tour — структурный массив шагов.
 *
 * Поля title/body вынесены в tour-i18n.js (по языкам). Здесь — только то,
 * что не зависит от языка: page, spotlight, tooltip placement, overlay.
 *
 *   - page:      имя HTML файла без суффиксов темы/языка ('step-N.html').
 *                Реальная страница вычисляется из текущей темы и языка
 *                (см. pageForVariant в tour.js).
 *   - spotlight: CSS-селектор. Используем стабильные суффиксы emotion-классов
 *                (`[class*="-foo"]`) или Antd-классы (`.ant-popover-inner`,
 *                `.ant-modal-content` и т.д.) — это работает и на dark, и на light.
 *   - tooltip:   { placement, offsetX?, offsetY? }
 *   - overlay:   { src, anchor?, w, h, x?, y? } — PNG-декаль поверх snapshot’а
 *                (для динамических состояний). В light-теме автоматически
 *                загружается foo-light.png если такой есть.
 */

window.TOUR_STEPS = [
  // 0 — Welcome screen.
  { page: 'step-0.html', welcome: true },

  // 1 — Language Switch (флаг в шапке).
  {
    page: 'step-0.html',
    spotlight: '#root .ant-layout > header > div img.ant-dropdown-trigger[class*="-flag"]',
    tooltip: { placement: 'bottom-end', offsetY: 12 },
  },

  // 2 — Light / Dark Theme (4-я кнопка в шапке).
  {
    page: 'step-0.html',
    spotlight: '#root .ant-layout > header > div > button:nth-child(4)',
    tooltip: { placement: 'bottom-end', offsetY: 12 },
  },

  // 3 — Кнопка «Показать плитки».
  {
    page: 'step-0.html',
    spotlight: '[class*="-showTilesButton"]',
    tooltip: { placement: 'bottom-end', offsetY: 12 },
  },

  // 4 — Меню пресетов: подсвечиваем и кнопку-триггер, и сам dropdown.
  // В snapshot’е dropdown зафиксирован на left: 791px — при viewport < 1600px
  // он «отрывается» от триггера. dropdownFix перепривязывает его под кнопку.
  {
    page: 'step-8.html',
    spotlight: [
      'main [class*="-flexRow"] [class*="-spaceCompact"] > div > button',
      '.ant-dropdown',
    ],
    dropdownFix: { anchor: 'main [class*="-flexRow"] [class*="-spaceCompact"] > div > button' },
    tooltip: { placement: 'right', offsetX: 16 },
  },

  // 5 — Удаление плитки (popover-card).
  // Popover в snapshot’е либо display:none, либо позиционирован через
  // bottom: NNN от высоты body → fixPopoverIfNeeded() ставит его над кебаб-
  // кнопкой первой плитки.
  {
    page: 'step-11.html',
    spotlight: '.ant-popover-placement-top .ant-popover-inner',
    popoverFix: { anchor: '[class*="-sliderTrack"] > [class*="-slide"]:nth-of-type(1) [class*="-actionsWrapper"] > button' },
    tooltip: { placement: 'right', offsetX: 16 },
  },

  // 6 — Создать пресет.
  {
    page: 'step-8.html',
    spotlight: '.ant-dropdown [class*="-flexRow"]:first-of-type button:first-of-type',
    tooltip: { placement: 'right', offsetX: 16 },
  },

  // 7 — Сектор плиток.
  {
    page: 'step-4.html',
    spotlight: '[class*="-sliderTrack"]',
    tooltip: { placement: 'bottom', offsetY: 16 },
  },

  // 8 — Кнопка (+) добавить плитку.
  {
    page: 'step-4.html',
    spotlight: '[class*="-addTileLength"]',
    tooltip: { placement: 'right', offsetX: 16 },
  },

  // 9 — Новая плитка.
  {
    page: 'step-5.html',
    spotlight: '[class*="-sliderTrack"] > div:first-child',
    tooltip: { placement: 'right', offsetX: 16 },
  },

  // 10 — Настройка временного интервала: рамка обнимает и datePicker, и
  // календарь (overlay) одним прямоугольником; tooltip слева от календаря.
  {
    page: 'step-1.html',
    spotlight: 'main [class*="-flexRow"] > div:nth-child(3)',
    overlay: { src: 'PickerDropdown.png', anchor: 'spotlight-below', w: 787, h: 392 },
    tooltip: { placement: 'left', offsetX: -16 },
  },

  // 11 — Подробнее: подсвечиваем кнопку More → во 2-й плитке + tooltip над
  // ней (правая граница tooltip-а выровнена с правой границей кнопки →
  // placement: 'top-end'; spotlightWithTooltip объединяет их в один cutout).
  // Popover с метриками подтягивается вплотную ко 2-й плитке через pinPopover
  // и подсвечивается через extraHighlights (outline + z-index выше dim-а).
  {
    page: 'step-7.html',
    spotlight: '[class*="-sliderTrack"] > [class*="-slide"]:nth-of-type(2) [class*="-footer"] > button',
    pinPopover: {
      selector: '.ant-popover',
      anchor: '[class*="-sliderTrack"] > [class*="-slide"]:nth-of-type(2)',
      placement: 'right',
      gap: 12,
    },
    extraHighlights: ['.ant-popover-inner'],
    spotlightWithTooltip: true,
    tooltip: { placement: 'top-end' },
  },

  // 12 — Прогнозирование (тот же popover, что 5).
  {
    page: 'step-11.html',
    spotlight: '.ant-popover-placement-top .ant-popover-inner',
    popoverFix: { anchor: '[class*="-sliderTrack"] > [class*="-slide"]:nth-of-type(1) [class*="-actionsWrapper"] > button' },
    tooltip: { placement: 'right', offsetX: 16 },
  },

  // 13 — Сохранение пресета.
  {
    page: 'step-8.html',
    spotlight: '.ant-dropdown [class*="-flexRow"]:last-of-type',
    tooltip: { placement: 'right', offsetX: 16 },
  },

  // 14 — Управление пресетом: tooltip слева, чтобы не перекрывал само меню.
  {
    page: 'step-8.html',
    spotlight: '[class*="-presetListWrapper"]',
    tooltip: { placement: 'left', offsetX: -16 },
  },

  // 15 — Метрики плитки.
  {
    page: 'step-9.html',
    spotlight: '.ant-modal-content',
    tooltip: { placement: 'right', offsetX: 16 },
  },

  // 16 — Скрытые метрики.
  {
    page: 'step-10.html',
    spotlight: '.ant-modal-content',
    tooltip: { placement: 'right', offsetX: 16 },
  },
];
