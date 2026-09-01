// Thin, typed wrapper around the compile-time defines. Kept as literal reads (not an
// imported JSON lookup at runtime) so each define stays a standalone constant esbuild can
// fold and dead-code-eliminate branches against; see vite-env.d.ts for why that matters.
export const variantId = __VARIANT_ID__;
export const friendCount = __FRIEND_COUNT__;
export const theme = __THEME__;
export const bundleBloat = __BUNDLE_BLOAT__;
export const virtualizationMode = __VIRTUALIZATION_MODE__;
export const focusBug = __FOCUS_BUG__;
export const contrastBug = __CONTRAST_BUG__;
export const routeDefault = __ROUTE_DEFAULT__;
