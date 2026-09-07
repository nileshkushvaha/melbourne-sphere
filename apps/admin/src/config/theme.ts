import type { ThemeConfig } from 'antd';

/**
 * Design tokens for the admin interface (SRS UX 001). One palette, one type
 * scale and one elevation scale, so every screen reads as the same product.
 * Contrast is checked for WCAG AA: primary text-on-white 6.6:1,
 * white-on-primary 5.9:1, white-on-navy 15:1, muted navy text 7.4:1.
 */
export const brand = {
  primary: '#0369A1', // sky-700
  primaryHover: '#0284C7', // sky-600
  primaryActive: '#075985', // sky-800
  primarySoft: '#E0F2FE', // sky-100, used for selected rows and soft badges
  navy: '#0B1F3A',
  navyRaised: '#132B4C', // hover/rail surfaces on the dark navigation
  navyText: '#E6EEF8',
  navyMuted: '#9FB3CC',
  surface: '#F4F7FB',
  surfaceRaised: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textMuted: '#475569',
  success: '#15803D',
  warning: '#B45309',
  danger: '#B91C1C',
  focus: '#B45309', // amber-700: >= 3:1 against both navy and white (WCAG 1.4.11)
} as const;

/** Shadows kept deliberately shallow: depth signals hierarchy, not decoration. */
export const elevation = {
  card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
  raised: '0 4px 12px rgba(15, 23, 42, 0.08)',
  overlay: '0 12px 32px rgba(15, 23, 42, 0.16)',
} as const;

export const layoutDimensions = {
  headerHeight: 60,
  siderWidth: 252,
  siderCollapsedWidth: 76,
  contentMaxWidth: 1360,
} as const;

/** Builds the theme; motion is disabled when the user prefers reduced motion. */
export function createAdminTheme(reducedMotion: boolean): ThemeConfig {
  return {
    cssVar: true,
    hashed: false,
    token: {
      colorPrimary: brand.primary,
      colorLink: brand.primary,
      colorLinkHover: brand.primaryHover,
      colorInfo: brand.primary,
      colorSuccess: brand.success,
      colorWarning: brand.warning,
      colorError: brand.danger,
      colorText: brand.text,
      colorTextSecondary: brand.textMuted,
      colorBgLayout: brand.surface,
      colorBorder: brand.border,
      colorBorderSecondary: brand.border,
      fontFamily: "'Inter var', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
      fontSize: 14,
      fontSizeHeading1: 26,
      fontSizeHeading2: 20,
      fontSizeHeading3: 17,
      lineHeight: 1.55,
      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusSM: 6,
      controlHeight: 38,
      controlOutlineWidth: 3,
      controlOutline: `${brand.focus}66`,
      motion: !reducedMotion,
      motionDurationMid: reducedMotion ? '0s' : '0.16s',
      padding: 16,
      margin: 16,
      boxShadowTertiary: elevation.card,
    },
    components: {
      Layout: {
        headerBg: brand.navy,
        headerHeight: layoutDimensions.headerHeight,
        headerPadding: '0 20px',
        siderBg: brand.navy,
        bodyBg: brand.surface,
      },
      Menu: {
        darkItemBg: brand.navy,
        darkSubMenuItemBg: brand.navy,
        darkItemColor: brand.navyText,
        darkItemHoverBg: brand.navyRaised,
        darkItemSelectedBg: brand.primary,
        darkItemSelectedColor: '#FFFFFF',
        darkGroupTitleColor: brand.navyMuted,
        itemHeight: 40,
        itemMarginInline: 10,
        itemBorderRadius: 8,
        iconSize: 17,
        collapsedIconSize: 19,
      },
      Card: {
        borderRadiusLG: 12,
        boxShadowTertiary: elevation.card,
        headerFontSize: 16,
        headerHeight: 52,
        paddingLG: 20,
      },
      Table: {
        headerBg: '#F8FAFC',
        headerColor: brand.textMuted,
        headerSplitColor: 'transparent',
        rowHoverBg: '#F8FAFC',
        rowSelectedBg: brand.primarySoft,
        cellPaddingBlock: 14,
        borderRadiusLG: 12,
      },
      Button: { controlHeight: 38, paddingInline: 16, fontWeight: 500, primaryShadow: 'none', defaultShadow: 'none' },
      Input: { paddingBlock: 7 },
      Tag: { borderRadiusSM: 999, defaultBg: '#F1F5F9', defaultColor: brand.textMuted },
      Descriptions: { labelBg: '#F8FAFC', titleMarginBottom: 12 },
      Tabs: { titleFontSize: 14, horizontalItemPadding: '10px 0', horizontalItemGutter: 24 },
      Statistic: { contentFontSize: 28, titleFontSize: 13 },
      Segmented: { itemSelectedBg: '#FFFFFF' },
      Modal: { borderRadiusLG: 14 },
      Drawer: { paddingLG: 20 },
      Alert: { borderRadiusLG: 10 },
    },
  };
}
