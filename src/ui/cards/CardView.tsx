import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { ActiveCardView } from '@/sim';
import type { Side } from '@/sim';
import { BAR_LABELS } from '@/ui/shell/Bars';
import { useStore } from '@/ui/shell/context';

const THRESHOLD = 88;
const TYPE_LABEL = { petition: 'Petition', tip: 'Tip', event: 'Event' } as const;

/** What a choice would move, in words, for people who cannot see the dots over the bars. */
const moves = (choice: ActiveCardView['left']): string => {
  const bars = [...new Set(choice.hints.map((h) => h.bar))];
  return bars.length > 0
    ? `${choice.label}. Moves ${bars.map((b) => BAR_LABELS[b]).join(' and ')}.`
    : choice.label;
};

const initials = (name: string): string =>
  name
    .replace(/^(Comrade|Director|Citizen|Chairman)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

/** A Reigns-style card: swipe left or right, or tap a button. Leaning shows dots over the bars. */
export function CardView({ card }: { card: ActiveCardView }) {
  const { dispatch } = useStore();
  const el = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; id: number } | null>(null);
  const [lean, setLean] = useState<Side | null>(null);
  const [gone, setGone] = useState<Side | null>(null);

  const setLeanBoth = (side: Side | null) => {
    setLean(side);
    dispatch({ type: 'lean', side });
  };

  useEffect(() => () => dispatch({ type: 'lean', side: null }), [dispatch]);
  // Bring the card to the keyboard: arrow keys answer it.
  useEffect(() => {
    el.current?.focus({ preventScroll: true });
  }, []);

  const commit = (side: Side) => {
    if (gone) return;
    setGone(side);
    const node = el.current;
    if (node) {
      node.style.transition = 'transform 200ms ease-in, opacity 200ms ease-in';
      node.style.transform = `translateX(${side === 'left' ? -140 : 140}%) rotate(${side === 'left' ? -14 : 14}deg)`;
      node.style.opacity = '0';
    }
    window.setTimeout(() => dispatch({ type: 'card', cardId: card.cardId, side }), 190);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (gone) return;
    drag.current = { x0: e.clientX, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (el.current) el.current.style.transition = 'none';
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !el.current) return;
    const dx = e.clientX - d.x0;
    el.current.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    const next: Side | null = dx < -24 ? 'left' : dx > 24 ? 'right' : null;
    if (next !== lean) setLeanBoth(next);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !el.current) return;
    const dx = e.clientX - d.x0;
    if (Math.abs(dx) > THRESHOLD) {
      commit(dx < 0 ? 'left' : 'right');
    } else {
      el.current.style.transition = 'transform 180ms ease-out';
      el.current.style.transform = '';
      setLeanBoth(null);
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') commit('left');
    if (e.key === 'ArrowRight') commit('right');
  };

  const leftOpacity = lean === 'left' ? 1 : 0.0;
  const rightOpacity = lean === 'right' ? 1 : 0.0;

  return (
    <section className="card-sheet" aria-label="A card needs your decision" data-testid="card">
      <div
        ref={el}
        className={`card card-${card.type}`}
        tabIndex={0}
        role="group"
        aria-label={`${TYPE_LABEL[card.type]} from ${card.character.name}. Swipe or use the arrow keys.`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <span
          className="card-stamp card-stamp-left"
          style={{ opacity: leftOpacity }}
          aria-hidden="true"
        >
          {card.left.label}
        </span>
        <span
          className="card-stamp card-stamp-right"
          style={{ opacity: rightOpacity }}
          aria-hidden="true"
        >
          {card.right.label}
        </span>
        <header className="card-head">
          <span className="monogram" aria-hidden="true">
            {initials(card.character.name)}
          </span>
          <div>
            <p className="card-type">{TYPE_LABEL[card.type]}</p>
            <h2 className="card-who">{card.character.name}</h2>
            <p className="card-title">{card.character.title}</p>
          </div>
        </header>
        <p className="card-text">{card.text}</p>
        {card.trackRecord && (
          <p className="card-track">
            Informant&rsquo;s record: <b>{card.trackRecord.right}</b> right,{' '}
            <b>{card.trackRecord.wrong}</b> wrong
          </p>
        )}
      </div>
      <div className="card-actions">
        <button
          type="button"
          className="btn btn-outline card-btn"
          data-testid="card-left"
          aria-label={moves(card.left)}
          onClick={() => commit('left')}
          onPointerEnter={() => setLeanBoth('left')}
          onPointerLeave={() => !drag.current && setLeanBoth(null)}
          onFocus={() => setLeanBoth('left')}
          onBlur={() => setLeanBoth(null)}
        >
          <span aria-hidden="true">&larr;</span> {card.left.label}
        </button>
        <button
          type="button"
          className="btn btn-ink card-btn"
          data-testid="card-right"
          aria-label={moves(card.right)}
          onClick={() => commit('right')}
          onPointerEnter={() => setLeanBoth('right')}
          onPointerLeave={() => !drag.current && setLeanBoth(null)}
          onFocus={() => setLeanBoth('right')}
          onBlur={() => setLeanBoth(null)}
        >
          {card.right.label} <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </section>
  );
}
