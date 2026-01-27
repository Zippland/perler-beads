'use client';

import { useState, useEffect } from 'react';

// 断点定义
export const BREAKPOINTS = {
  mobile: 0,      // 0-639px
  tablet: 640,    // 640-1023px
  desktop: 1024,  // 1024-1279px
  wide: 1280,     // 1280px+
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

interface ResponsiveState {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  isTouchDevice: boolean;
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

function checkIsTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// 默认状态 - SSR 和客户端初始渲染时使用，确保一致性
const DEFAULT_STATE: ResponsiveState = {
  width: 1024,
  height: 768,
  breakpoint: 'desktop',
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isWide: false,
  isTouchDevice: false,
};

export function useResponsive(): ResponsiveState {
  // 始终以默认状态初始化，确保 SSR 和客户端初始渲染一致
  const [state, setState] = useState<ResponsiveState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 标记已挂载
    setMounted(true);

    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const breakpoint = getBreakpoint(width);

      setState({
        width,
        height,
        breakpoint,
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
        isWide: breakpoint === 'wide',
        isTouchDevice: checkIsTouchDevice(),
      });
    }

    // 挂载后立即获取实际尺寸
    handleResize();

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 未挂载时返回默认状态，避免水合不匹配
  if (!mounted) {
    return DEFAULT_STATE;
  }

  return state;
}

// 媒体查询 Hook
export function useMediaQuery(query: string): boolean {
  // 始终以 false 初始化，确保 SSR 和客户端初始渲染一致
  const [matches, setMatches] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // 挂载后立即获取实际值
    setMatches(mediaQuery.matches);

    // 监听变化
    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  // 未挂载时返回 false，避免水合不匹配
  if (!mounted) {
    return false;
  }

  return matches;
}

// 预设媒体查询
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.tablet - 1}px)`);
}

export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
