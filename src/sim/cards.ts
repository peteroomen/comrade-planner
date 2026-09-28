import { CARDS, CARD_BY_ID } from '@/content/cards';
import type { CardDef } from '@/content/cards';
import * as B from './balance';
import { applyBar } from './bars';
import { applyEffect } from './effects';
import { chance, int, pick, shuffle } from './rng';
import { claimTrue } from './tips';
import type { CardInstance, GameState, Pin, ScheduledCard, Side } from './types';

function available(state: GameState, type: 'tip' | 'other'): CardDef[] {
  const recent = new Set(state.cardHistory.slice(-B.CARD_COOLDOWN));
  const pool = CARDS.filter((c) => (type === 'tip' ? c.type === 'tip' : c.type !== 'tip')).filter(
    (c) => c.condition(state),
  );
  const fresh = pool.filter((c) => !recent.has(c.id));
  return fresh.length > 0 ? fresh : pool;
}

/**
 * Lay out this quarter's card slots: 3 to 5 cards spread across ticks 1..12. Higher Shadow means
 * more informants come forward. Which card fills a slot is decided when the slot comes up.
 */
export function scheduleCards(state: GameState): void {
  const n = int(state, B.CARDS_MIN, B.CARDS_MAX);
  const tipCount = Math.min(n, 1 + Math.floor(state.bars.shadow / B.TIPS_PER_SHADOW));
  const kinds = shuffle<'tip' | 'other'>(state, [
    ...Array<'tip'>(tipCount).fill('tip'),
    ...Array<'other'>(n - tipCount).fill('other'),
  ]);
  const last = B.TICKS_PER_QUARTER - 1;
  const used = new Set<number>();
  const slots: ScheduledCard[] = [];
  for (let i = 0; i < n; i++) {
    let tick = 1 + Math.floor(((i + 0.5) * last) / n) + int(state, -1, 1);
    tick = Math.min(last, Math.max(1, tick));
    while (used.has(tick)) tick = tick >= last ? 1 : tick + 1;
    used.add(tick);
    slots.push({ tick, kind: kinds[i] ?? 'other', done: false });
  }
  state.cardSchedule = slots.sort((a, b) => a.tick - b.tick);
}

/** Informants are more likely to bring true tips the more reliable they are. */
function pickTip(state: GameState): CardDef | null {
  const pool = available(state, 'tip');
  if (pool.length === 0) return null;
  const informants = [...new Set(pool.map((c) => c.character))];
  const who = pick(state, informants);
  const reliability = state.informants[who]?.reliability ?? 0.5;
  const wantTrue = chance(state, reliability);
  const theirs = pool.filter((c) => c.character === who);
  const matching = theirs.filter(
    (c) => c.tip !== undefined && claimTrue(state, c.tip.target, c.tip.claim) === wantTrue,
  );
  return pick(state, matching.length > 0 ? matching : theirs);
}

function instantiate(state: GameState, card: CardDef): CardInstance {
  const veracity = card.tip ? claimTrue(state, card.tip.target, card.tip.claim) : null;
  return { cardId: card.id, tick: state.week, veracity };
}

/** If a slot is due this week, make its card the active card (the quarter then pauses). */
export function presentDueCard(state: GameState): void {
  const slot = state.cardSchedule.find((s) => !s.done && s.tick <= state.week);
  if (!slot) return;
  slot.done = true;
  const card = slot.kind === 'tip' ? pickTip(state) : pick(state, available(state, 'other'));
  if (!card) return;
  state.activeCard = instantiate(state, card);
}

/** The player picks a side. Effects run, tips may drop a pin. */
export function resolveCard(state: GameState, cardId: string, side: Side): boolean {
  const active = state.activeCard;
  const card = CARD_BY_ID[cardId];
  if (!active || active.cardId !== cardId || !card) return false;
  const choice = side === 'left' ? card.left : card.right;
  for (const fx of choice.effects) applyEffect(state, fx);
  if (card.tip) {
    if (choice.pin) {
      const pin: Pin = {
        id: state.nextId++,
        cardId,
        informant: card.character,
        target: card.tip.target,
        claim: card.tip.claim,
        label: card.tip.pinLabel,
        quarterPlaced: state.quarter,
        status: 'open',
      };
      state.pins.push(pin);
    } else if (active.veracity) {
      // Brushing off a true tip lets the shadow economy breathe.
      applyBar(state, 'shadow', B.SHADOW_TOLERATED_TIP);
    }
  }
  state.cardHistory.push(cardId);
  state.cardLog.push({ quarter: state.quarter, tick: state.week, cardId, side });
  state.activeCard = null;
  return true;
}
