// Four base themes, each hand-picked to be comfortably WCAG AA compliant (axe-core is the
// actual judge; these were chosen with generous headroom, not tuned to a borderline pass).
// The 7 contrast-* seeded regressions each override exactly one token pair in one theme to
// drop it below AA, simulating a real design-token mistake (one wrong hex in one place),
// not a globally broken theme.

export type ThemeTokens = {
  bg: string;
  text: string;
  headingText: string;
  panelBg: string;
  buttonBg: string;
  buttonText: string;
  linkColor: string;
  badgeBg: string;
  badgeText: string;
  chipActiveBg: string;
  chipActiveText: string;
  navBg: string;
  navText: string;
  navActiveText: string;
  errorBg: string;
  errorText: string;
};

const THEMES: Record<string, ThemeTokens> = {
  light: {
    bg: '#FFFFFF',
    text: '#1A1A1A',
    headingText: '#0F0F0F',
    panelBg: '#F5F7FA',
    buttonBg: '#0B3D91',
    buttonText: '#FFFFFF',
    linkColor: '#0B3D91',
    badgeBg: '#E3F2E6',
    badgeText: '#1B5E20',
    chipActiveBg: '#0B3D91',
    chipActiveText: '#FFFFFF',
    navBg: '#0F1B2D',
    navText: '#FFFFFF',
    navActiveText: '#FFD400',
    errorBg: '#FDEDED',
    errorText: '#8B211C',
  },
  dark: {
    bg: '#121212',
    text: '#F5F5F5',
    headingText: '#FFFFFF',
    panelBg: '#1E1E1E',
    buttonBg: '#7CB8FF',
    buttonText: '#0B1F3A',
    linkColor: '#8AB4FF',
    badgeBg: '#1B3B22',
    badgeText: '#8BE28B',
    chipActiveBg: '#7CB8FF',
    chipActiveText: '#0B1F3A',
    navBg: '#000000',
    navText: '#F5F5F5',
    navActiveText: '#FFD400',
    errorBg: '#3A1212',
    errorText: '#FF8A80',
  },
  'high-contrast': {
    bg: '#000000',
    text: '#FFFFFF',
    headingText: '#FFFFFF',
    panelBg: '#000000',
    buttonBg: '#FFD400',
    buttonText: '#000000',
    linkColor: '#FFD400',
    badgeBg: '#000000',
    badgeText: '#FFFFFF',
    chipActiveBg: '#FFFFFF',
    chipActiveText: '#000000',
    navBg: '#000000',
    navText: '#FFFFFF',
    navActiveText: '#FFD400',
    errorBg: '#000000',
    errorText: '#FF6B6B',
  },
  'brand-blue': {
    bg: '#0B1F3A',
    text: '#FFFFFF',
    headingText: '#FFFFFF',
    panelBg: '#123156',
    buttonBg: '#FFB020',
    buttonText: '#1A1200',
    linkColor: '#FFD787',
    badgeBg: '#06152B',
    badgeText: '#FFFFFF',
    chipActiveBg: '#FFB020',
    chipActiveText: '#1A1200',
    navBg: '#06152B',
    navText: '#FFFFFF',
    navActiveText: '#FFD400',
    errorBg: '#3A0F0F',
    errorText: '#FF9B9B',
  },
};

// Each entry overrides exactly one token pair on top of its base theme, deliberately
// dropping that pair below 4.5:1 (normal text) / 3:1 (large text, UI components).
const CONTRAST_BUG_OVERRIDES: Record<string, Partial<ThemeTokens>> = {
  'light-gray-body-text': { text: '#B0B0B0' }, // ~2.4:1 on white
  'primary-button-low-contrast': { buttonBg: '#8FB8FF', buttonText: '#FFFFFF' }, // ~1.9:1
  'link-on-tinted-panel': { panelBg: '#DCEBFF', linkColor: '#7AA7FF' }, // ~2.0:1
  'status-badge-low-contrast': { badgeBg: '#C8E6C9', badgeText: '#66BB6A' }, // ~2.1:1
  'filter-chip-active-low-contrast': { chipActiveBg: '#D0D0D0', chipActiveText: '#FFFFFF' }, // ~1.5:1
  'dark-theme-error-text': { errorBg: '#3A1212', errorText: '#7A3030' }, // ~1.8:1
  'nav-active-tab-low-contrast': { navActiveText: '#3A5B8A' }, // ~2.0:1 on navBg
};

export function resolveTheme(themeName: string, contrastBug: string): ThemeTokens {
  const base = THEMES[themeName] ?? THEMES.light;
  if (contrastBug === 'none') return base;
  const override = CONTRAST_BUG_OVERRIDES[contrastBug];
  return override ? { ...base, ...override } : base;
}
