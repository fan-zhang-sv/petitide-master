export const breakpoints = {
  compact: 340,
  phone: 380,
  phoneWide: 430,
  mobileNav: 768,
  content: 980,
  desktop: 1024,
  wide: 1180,
} as const;

export type BreakpointName = keyof typeof breakpoints;

export const mediaQueries = {
  compact: `(max-width: ${breakpoints.compact}px)`,
  phone: `(max-width: ${breakpoints.phone}px)`,
  phoneWide: `(max-width: ${breakpoints.phoneWide}px)`,
  belowMobileNav: `(max-width: ${breakpoints.mobileNav - 1}px)`,
  mobileNav: `(min-width: ${breakpoints.mobileNav}px)`,
  content: `(min-width: ${breakpoints.content}px)`,
  desktop: `(min-width: ${breakpoints.desktop}px)`,
  wide: `(min-width: ${breakpoints.wide}px)`,
} as const;
