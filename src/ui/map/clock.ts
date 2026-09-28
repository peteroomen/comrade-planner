// The animation clock: how far through the current week we are (0..1). It lives outside React so
// the trains can redraw every frame without re-rendering the rest of the game.

let tp = 0;
const listeners = new Set<() => void>();

export const clock = {
  get: (): number => tp,
  set: (v: number): void => {
    if (v === tp) return;
    tp = v;
    for (const l of listeners) l();
  },
  subscribe: (fn: () => void): (() => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
