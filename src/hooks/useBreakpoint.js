import { useWindowDimensions } from 'react-native';

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

/**
 * Returns boolean breakpoint flags based on the current window width.
 * Use this in .web.js files to render responsive layouts.
 */
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    width,
    isMobile: width < BREAKPOINTS.md,      // < 768px  — phone layout
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,  // 768–1023
    isDesktop: width >= BREAKPOINTS.lg,     // >= 1024px — full desktop
    isWide: width >= BREAKPOINTS.xl,        // >= 1280px
  };
}
