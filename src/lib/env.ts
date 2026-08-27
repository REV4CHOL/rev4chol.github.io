export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const finePointer = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

export const isMobile = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;

export const liveVideoCap = (): number => (isMobile() ? 4 : 10);

export const dprCap = (): number => Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
