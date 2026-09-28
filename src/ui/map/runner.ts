import { useEffect, useRef } from 'react';
import { tickMs } from '@/ui/shell/limits';
import type { Store, UiState } from '@/ui/shell/store';
import { clock, prefersReducedMotion } from './clock';

/**
 * Drives a live quarter: advances the animation clock every frame and asks the sim for a new
 * week when the clock wraps. Stops while paused, while a card waits, or once the desk is reached.
 * With reduced motion the clock stays at zero so trains jump from tick to tick.
 */
export function useQuarterRunner(store: Store, ui: UiState): void {
  const progress = useRef(0);
  const active = ui.game.phase === 'quarter' && !ui.paused && ui.game.activeCard === null;

  useEffect(() => {
    if (ui.game.phase !== 'quarter') {
      progress.current = 0;
      clock.set(0);
    }
  }, [ui.game.phase]);

  useEffect(() => {
    if (!active) return;
    const reduced = prefersReducedMotion();
    const weekMs = tickMs();
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const st = store.get();
      if (st.game.phase !== 'quarter' || st.paused || st.game.activeCard) return;
      const dt = Math.min(80, now - last);
      last = now;
      progress.current += (dt * st.speed) / weekMs;
      if (progress.current >= 1) {
        progress.current = 0;
        clock.set(0);
        store.dispatch({ type: 'tick' });
      } else {
        clock.set(reduced ? 0 : progress.current);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, store]);
}
