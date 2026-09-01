/// <reference types="vite/client" />

// Build-time constants injected by vite.config.ts's `define`, resolved from variants.json
// for whichever VARIANT_ID the build was invoked with. Each is a compile-time string
// literal after esbuild substitutes it, so `if (__BUNDLE_BLOAT__ === 'moment-full')`
// branches that are not selected are dead code eliminated at minify time: a variant that
// does not select a given bloat/bug mode does not ship that mode's code, which is what
// makes the bundle-budget regressions and the clean variants differ in real, measured bytes.
declare const __VARIANT_ID__: string;
declare const __FRIEND_COUNT__: number;
declare const __THEME__: string;
declare const __BUNDLE_BLOAT__: string;
declare const __VIRTUALIZATION_MODE__: string;
declare const __FOCUS_BUG__: string;
declare const __CONTRAST_BUG__: string;
declare const __ROUTE_DEFAULT__: string;

declare module 'virtual:friends-bloat' {
  export const bloatPayload: string | unknown[];
  export const bloatMarker: string;
}
declare module 'virtual:party-bloat' {
  export const bloatPayload: string | unknown[];
  export const bloatMarker: string;
}

