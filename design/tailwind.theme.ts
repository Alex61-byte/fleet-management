/**
 * NativeWind / Tailwind theme bridge.
 * Map semantic token names into theme keys. Do not use raw hex in class lists.
 * Dark mode: same keys, values from semantic.color.dark (class `dark:`).
 *
 * CSS variables (set by FE from semantic light/dark — hex lives in tokens only):
 * --color-canvas, --color-surface, --color-surface-raised, --color-surface-sunken,
 * --color-surface-overlay, --color-sidebar, --color-sidebar-hover, --color-sidebar-selected,
 * --color-nav-fg, --color-nav-fg-muted, --color-nav-fg-selected,
 * --color-text-primary, --color-text-secondary, --color-text-inverse,
 * --color-border, --color-divider, --color-table-border, --color-table-header,
 * --color-table-row-hover, --color-table-row-selected,
 * --color-brand, --color-brand-hover, --color-brand-pressed, --color-brand-subtle,
 * --color-brand-accent, --color-mark-fill, --color-mark-glyph, --color-mark-plate-face,
 * --color-link, --color-link-hover, --color-link-pressed,
 * --color-danger, --color-danger-hover, --color-danger-subtle,
 * --color-warning, --color-warning-subtle, --color-success, --color-success-subtle,
 * --color-nav-urgency-critical, --color-nav-urgency-critical-hover,
 * --color-nav-urgency-soon, --color-nav-urgency-soon-hover, --color-nav-urgency-fg,
 * --color-info, --color-info-subtle, --color-focus, --color-ring,
 * --color-disabled, --color-disabled-surface, --color-hover, --color-pressed, --color-selected
 *
 * Not application feature code — Design Specialist token mapping only.
 */

export const fleetTheme = {
  colors: {
    canvas: "var(--color-canvas)",
    surface: "var(--color-surface)",
    "surface-raised": "var(--color-surface-raised)",
    "surface-sunken": "var(--color-surface-sunken)",
    "surface-overlay": "var(--color-surface-overlay)",
    sidebar: "var(--color-sidebar)",
    "sidebar-hover": "var(--color-sidebar-hover)",
    "sidebar-selected": "var(--color-sidebar-selected)",
    "nav-fg": "var(--color-nav-fg)",
    "nav-fg-muted": "var(--color-nav-fg-muted)",
    "nav-fg-selected": "var(--color-nav-fg-selected)",
    "text-primary": "var(--color-text-primary)",
    "text-secondary": "var(--color-text-secondary)",
    "text-inverse": "var(--color-text-inverse)",
    border: "var(--color-border)",
    divider: "var(--color-divider)",
    "table-border": "var(--color-table-border)",
    "table-header": "var(--color-table-header)",
    "table-row-hover": "var(--color-table-row-hover)",
    "table-row-selected": "var(--color-table-row-selected)",
    brand: "var(--color-brand)",
    "brand-hover": "var(--color-brand-hover)",
    "brand-pressed": "var(--color-brand-pressed)",
    "brand-subtle": "var(--color-brand-subtle)",
    "brand-accent": "var(--color-brand-accent)",
    "mark-fill": "var(--color-mark-fill)",
    "mark-glyph": "var(--color-mark-glyph)",
    "mark-plate-face": "var(--color-mark-plate-face)",
    link: "var(--color-link)",
    "link-hover": "var(--color-link-hover)",
    "link-pressed": "var(--color-link-pressed)",
    danger: "var(--color-danger)",
    "danger-hover": "var(--color-danger-hover)",
    "danger-subtle": "var(--color-danger-subtle)",
    warning: "var(--color-warning)",
    "warning-subtle": "var(--color-warning-subtle)",
    "nav-urgency-critical": "var(--color-nav-urgency-critical)",
    "nav-urgency-critical-hover": "var(--color-nav-urgency-critical-hover)",
    "nav-urgency-soon": "var(--color-nav-urgency-soon)",
    "nav-urgency-soon-hover": "var(--color-nav-urgency-soon-hover)",
    "nav-urgency-fg": "var(--color-nav-urgency-fg)",
    success: "var(--color-success)",
    "success-subtle": "var(--color-success-subtle)",
    info: "var(--color-info)",
    "info-subtle": "var(--color-info-subtle)",
    focus: "var(--color-focus)",
    ring: "var(--color-ring)",
    disabled: "var(--color-disabled)",
    "disabled-surface": "var(--color-disabled-surface)",
    hover: "var(--color-hover)",
    pressed: "var(--color-pressed)",
    selected: "var(--color-selected)",
  },
  spacing: {
    0: "0px",
    px: "1px",
    0.5: "4px",
    1: "8px",
    1.5: "12px",
    2: "16px",
    2.5: "20px",
    3: "24px",
    4: "32px",
    5: "40px",
    6: "48px",
    8: "64px",
    10: "80px",
    hit: "44px",
    sidebar: "256px",
    "sidebar-collapsed": "64px",
    "page-header": "56px",
    mark: "24px",
    "mark-auth": "32px",
    "mark-public": "20px",
    "mark-public-width": "40px",
    "nav-icon": "20px",
    "hero-map": "320px",
    "brand-bar": "2px",
    "link-underline-offset": "2px",
    "app-bar": "56px",
    "table-row": "44px",
    "list-row": "56px",
    "auth-card": "420px",
    "content-gutter-compact": "24px",
    "content-gutter-comfortable": "16px",
  },
  fontSize: {
    overline: ["11px", { lineHeight: "1.3", letterSpacing: "0.08em" }],
    caption: ["12px", { lineHeight: "1.35" }],
    table: ["13px", { lineHeight: "1.35" }],
    label: ["14px", { lineHeight: "1.4" }],
    body: ["16px", { lineHeight: "1.5" }],
    section: ["16px", { lineHeight: "1.35" }],
    title: ["20px", { lineHeight: "1.3" }],
    page: ["24px", { lineHeight: "1.25" }],
    display: ["32px", { lineHeight: "1.15" }],
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  fontFamily: {
    sans: ["Inter", "system-ui", "SF Pro Text", "Roboto", "sans-serif"],
    tabular: ["Inter", "ui-sans-serif", "SF Pro Text", "Roboto", "sans-serif"],
  },
  borderRadius: {
    none: "0px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    full: "9999px",
  },
  boxShadow: {
    none: "none",
    raised: "0px 1px 2px var(--color-border)",
    overlay: "0px 8px 24px var(--color-surface-overlay)",
    ring: "0 0 0 2px var(--color-ring)",
  },
  underlineOffset: {
    "link-underline-offset": "2px",
  },
  borderWidth: {
    DEFAULT: "1px",
    px: "1px",
    "brand-bar": "2px",
  },
} as const;

/** Canonical class lists — FE must use these names, never hex */
export const themeClasses = {
  page: "bg-canvas text-text-primary font-sans",
  pageAuth: "bg-canvas text-text-primary font-sans min-h-full",
  pagePublic: "bg-canvas text-text-primary font-sans min-h-full",
  publicHeader:
    "sticky top-0 z-20 h-app-bar w-full bg-surface-raised border-b border-divider border-t-brand-bar border-t-brand-accent px-content-gutter-compact flex flex-row items-center justify-between gap-2",
  publicLockup: "flex flex-row items-center gap-1.5 min-h-hit",
  publicWordmark: "text-title font-semibold text-text-primary tracking-tight",
  publicHeaderActions: "flex flex-row items-center gap-1",
  publicBody:
    "flex-1 bg-canvas px-content-gutter-compact py-3 flex flex-col gap-3",
  publicHero: "flex flex-col gap-3 items-stretch",
  publicHeroWide: "flex flex-row gap-3 items-stretch",
  publicHeroCopy: "flex flex-col gap-1 justify-center flex-1 min-w-0",
  publicHeroTitle:
    "font-sans text-page font-semibold text-text-primary tracking-tight",
  publicHeroCaption: "font-sans text-body font-regular text-text-secondary",
  publicHeroMapStack: "flex-1 min-w-0 flex flex-col gap-1",
  publicHeroMap:
    "w-full max-h-hero-map bg-surface-raised border border-border rounded-lg shadow-raised overflow-hidden",
  publicHeroMapImage: "w-full h-full max-h-hero-map",
  publicHeroMapSkeleton: "w-full h-hero-map max-h-hero-map bg-disabled-surface",
  publicHeroMapCaption:
    "font-sans text-caption font-regular text-text-secondary",
  publicDescription:
    "bg-surface-raised border border-border rounded-lg shadow-raised p-3 flex flex-col gap-1",
  publicDescriptionTitle: "font-sans text-section font-semibold text-text-primary",
  publicDescriptionBody: "font-sans text-body font-regular text-text-primary",
  publicIdentity:
    "max-w-auth-card px-content-gutter-compact py-8 flex flex-col gap-1",
  publicIdentityTitle:
    "font-sans text-page font-semibold text-text-primary tracking-tight",
  publicIdentityCaption: "font-sans text-body font-regular text-text-secondary",
  shell: "flex flex-row min-h-full bg-canvas",
  sidebar:
    "w-sidebar min-h-full bg-sidebar border-r border-divider flex flex-col border-t-brand-bar border-t-brand-accent",
  sidebarCollapsed:
    "w-sidebar-collapsed min-h-full bg-sidebar border-r border-divider border-t-brand-bar border-t-brand-accent",
  sidebarLockup: "h-app-bar px-2 flex flex-row items-center gap-1.5",
  sidebarProduct: "text-title font-semibold text-nav-fg-selected tracking-tight",
  sidebarMeta: "text-caption text-nav-fg-muted",
  brandMark: "h-mark w-mark shrink-0",
  brandMarkAuth: "h-mark-auth w-mark-auth shrink-0",
  brandMarkPublic: "h-mark-public w-mark-public-width shrink-0",
  brandMarkGlyph: "fill-mark-glyph",
  brandMarkFill: "fill-mark-fill",
  brandMarkAccent: "fill-brand-accent",
  brandMarkPlateFace: "fill-mark-plate-face",
  brandMarkPlateEdge: "stroke-mark-fill",
  /** US-31 / US-32 — outline nav/tab glyph box; stroke via currentColor */
  navIcon: "h-nav-icon w-nav-icon shrink-0",
  navIconGlyph: "h-full w-full",
  navItem:
    "min-h-hit px-2 mx-1 rounded-md text-label font-medium text-nav-fg flex flex-row items-center gap-1.5",
  navItemHover: "bg-sidebar-hover text-nav-fg-selected",
  /**
   * Selected on navy rail. Use ! on bg/text so Tailwind source-order does not
   * let base `text-nav-fg` / transparent bg win over selected utilities.
   */
  navItemSelected:
    "!bg-sidebar-hover !text-nav-fg-selected font-semibold border-l-2 border-brand-accent shadow-none",
  navItemFocus: "shadow-ring",
  /** US-28 Vehicles sidebar item only — solid fills, not badge *-subtle */
  navItemUrgencyCritical: "bg-nav-urgency-critical text-nav-urgency-fg",
  navItemUrgencyCriticalHover: "bg-nav-urgency-critical-hover text-nav-urgency-fg",
  navItemUrgencySoon: "bg-nav-urgency-soon text-nav-urgency-fg",
  navItemUrgencySoonHover: "bg-nav-urgency-soon-hover text-nav-urgency-fg",
  navItemUrgencySelected:
    "font-semibold border-l-2 border-nav-urgency-fg text-nav-urgency-fg",
  content: "flex-1 min-w-0 bg-canvas",
  contentPadCompact: "px-content-gutter-compact py-3",
  contentPadComfortable: "px-content-gutter-comfortable py-2",
  pageHeader:
    "min-h-page-header flex flex-row items-start justify-between gap-2 pb-2 border-b border-divider",
  pageTitle: "font-sans text-page font-semibold text-text-primary tracking-tight",
  pageTitleMobile: "font-sans text-title font-semibold text-text-primary",
  pageSubtitle: "font-sans text-caption font-regular text-text-secondary mt-0.5",
  pageHeaderActions: "flex flex-row items-center gap-1",
  toolbar:
    "h-hit flex flex-row items-center gap-1 px-1.5 bg-surface-raised border-b border-divider",
  raised: "bg-surface-raised border border-border rounded-lg shadow-raised",
  panel: "bg-surface-raised border border-border rounded-lg shadow-raised p-3",
  kpi: "bg-surface-raised border border-border rounded-lg shadow-raised p-2 min-h-hit",
  kpiCaption: "font-sans text-overline font-medium uppercase text-text-secondary",
  kpiValue:
    "font-tabular text-display font-semibold text-text-primary tabular-nums mt-0.5",
  authCanvas: "bg-canvas min-h-full items-center justify-center px-2 py-4",
  authCard:
    "w-full max-w-auth-card bg-surface-raised border border-border rounded-lg shadow-raised p-4 border-t-brand-bar border-t-brand-accent",
  authLockup: "flex flex-row items-center gap-1.5",
  authWordmark: "text-title font-semibold text-text-primary tracking-tight",
  authCaptionLockup: "text-caption font-regular text-text-secondary",
  authTitle: "font-sans text-page font-semibold text-text-primary mt-2",
  authCaption: "font-sans text-caption font-regular text-text-secondary mt-1",
  authLinks: "flex flex-col items-start gap-0 mt-2",
  tableWrap: "bg-surface-raised border border-border rounded-lg overflow-hidden",
  tableHeader: "sticky top-0 z-10 bg-table-header border-b border-table-border",
  tableHeaderCell:
    "h-hit px-1.5 font-sans text-overline font-semibold uppercase text-text-secondary text-left",
  tableRow: "min-h-table-row border-b border-table-border bg-surface-raised",
  tableRowHover: "bg-table-row-hover",
  tableRowSelected: "bg-table-row-selected",
  tableCell: "px-1.5 py-1 font-sans text-table text-text-primary",
  tableCellMuted: "px-1.5 py-1 font-sans text-table text-text-secondary",
  tableCellNum: "px-1.5 py-1 font-tabular text-table tabular-nums text-text-primary",
  tableCellLink:
    "px-1.5 py-1 font-sans text-table font-medium text-text-primary no-underline",
  tableCellLinkHover: "text-link",
  listRow: "min-h-list-row px-2 py-1.5 bg-surface-raised border-b border-divider",
  overline:
    "font-sans text-overline font-semibold uppercase tracking-wide text-text-secondary",
  sectionTitle: "font-sans text-section font-semibold text-text-primary",
  title: "font-sans text-title font-semibold text-text-primary",
  body: "font-sans text-body font-regular text-text-primary",
  caption: "font-sans text-caption font-regular text-text-secondary",
  label: "font-sans text-label font-medium text-text-primary",
  buttonPrimary:
    "min-h-hit px-2 rounded-md bg-brand text-text-inverse font-sans text-label font-semibold",
  buttonPrimaryHover: "bg-brand-hover",
  buttonPrimaryPressed: "bg-brand-pressed",
  buttonSecondary:
    "min-h-hit px-2 rounded-md bg-surface-raised text-text-primary border border-border font-sans text-label font-semibold",
  buttonSecondaryHover: "bg-hover",
  buttonDanger:
    "min-h-hit px-2 rounded-md bg-danger text-text-inverse font-sans text-label font-semibold",
  buttonDangerHover: "bg-danger-hover",
  buttonGhost:
    "min-h-hit px-2 rounded-md bg-transparent text-text-primary font-sans text-label font-medium",
  buttonGhostHover: "bg-hover",
  buttonIcon: "h-hit w-hit items-center justify-center rounded-md",
  buttonDisabled: "bg-disabled-surface text-disabled",
  buttonFocus: "shadow-ring",
  input:
    "min-h-hit px-1.5 rounded-md bg-surface-raised border border-border text-body text-text-primary",
  inputHover: "bg-surface-sunken border-border",
  inputFocus: "border-focus shadow-ring",
  inputError: "border-danger",
  badgeWarning:
    "px-1 py-0.5 rounded-sm bg-warning-subtle text-warning text-caption font-medium",
  badgeExpired:
    "px-1 py-0.5 rounded-sm bg-danger-subtle text-danger text-caption font-medium",
  badgeOk:
    "px-1 py-0.5 rounded-sm bg-success-subtle text-success text-caption font-medium",
  badgeNeutral:
    "px-1 py-0.5 rounded-sm bg-surface-sunken text-text-secondary text-caption font-medium",
  link: "text-link text-label font-medium underline underline-offset-link-underline-offset min-h-hit",
  linkHover: "text-link-hover font-semibold underline",
  linkFocus: "shadow-ring underline",
  linkPressed: "text-link-pressed",
  linkMuted:
    "text-text-secondary text-label font-medium underline underline-offset-link-underline-offset min-h-hit",
  linkDisabled: "text-disabled no-underline min-h-hit",
  errorText: "text-danger text-caption",
  bannerDanger:
    "bg-danger-subtle text-danger border border-danger rounded-md px-2 py-1.5",
  bannerWarning:
    "bg-warning-subtle text-warning border border-warning rounded-md px-2 py-1.5",
  emptyState: "py-8 items-center",
  skeleton: "bg-disabled-surface rounded-sm",
  appBarMobile:
    "h-app-bar bg-surface-raised border-b border-divider px-2 flex flex-row items-center gap-1",
  appBarProduct: "text-title font-semibold text-text-primary tracking-tight",
  tabBarMobile: "h-hit bg-surface-raised border-t border-divider flex flex-row",
  tabItem:
    "flex-1 min-h-hit px-1 flex flex-col items-center justify-center gap-0.5 text-caption font-medium text-text-secondary",
  tabItemSelected:
    "text-brand font-semibold border-t-2 border-brand",
  tabItemFocus: "shadow-ring",
  /** US-28 Vehicles tab only — same solid urgency tokens as sidebar */
  tabItemUrgencyCritical: "bg-nav-urgency-critical text-nav-urgency-fg",
  tabItemUrgencyCriticalHover: "bg-nav-urgency-critical-hover text-nav-urgency-fg",
  tabItemUrgencySoon: "bg-nav-urgency-soon text-nav-urgency-fg",
  tabItemUrgencySoonHover: "bg-nav-urgency-soon-hover text-nav-urgency-fg",
  tabItemUrgencySelected:
    "font-semibold border-t-2 border-nav-urgency-fg text-nav-urgency-fg",
} as const;
