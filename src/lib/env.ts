// Calm mode is a SITE choice, not the OS's. Motion is this site's identity, so it
// runs full by default: Windows commonly ships with "animation effects" off, which
// Chrome reports as prefers-reduced-motion — honoring that silently killed every
// animation for those visitors (including the owner). The HUD MTN toggle
// (lib/motion.ts) and the pre-paint <head> snippet stamp .rvl-calm on <html>;
// that class is the single source of truth for stillness.
export const reducedMotion = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('rvl-calm');

export const finePointer = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

export const isMobile = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;

export const liveVideoCap = (): number => (isMobile() ? 4 : 10);

export const dprCap = (): number => Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
