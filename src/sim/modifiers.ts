import type { GameState, ModifierName } from './types';

/** Product of all active modifiers with this name (1 when none). */
export function modifierValue(state: Pick<GameState, 'modifiers'>, name: ModifierName): number {
  let v = 1;
  for (const m of state.modifiers) if (m.name === name) v *= m.value;
  return v;
}

/** Called at quarter end: age modifiers and drop expired ones. */
export function ageModifiers(state: Pick<GameState, 'modifiers'>): void {
  for (const m of state.modifiers) m.quartersLeft -= 1;
  state.modifiers = state.modifiers.filter((m) => m.quartersLeft > 0);
}
