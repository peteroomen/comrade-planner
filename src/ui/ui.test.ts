import { describe, expect, it } from 'vitest';
import { activeCard, deskReports, reckoning, visibleMap } from '@/sim';
import { distanceAt, pointAt, trackOf } from './map/geometry';
import { initialState, reduce } from './shell/store';
import type { Action, UiState } from './shell/store';

const run = (s: UiState, ...actions: Action[]): UiState => actions.reduce(reduce, s);

describe('ui store', () => {
  it('plays a whole quarter through the reducer: plan, live, desk, own report, reckoning', () => {
    let ui = run(initialState(77), { type: 'start' });
    ui = run(
      ui,
      { type: 'observer', ref: { type: 'enterprise', id: 'kolos' } },
      { type: 'observer', ref: { type: 'town', id: 'oblastgrad' } },
      { type: 'observer', ref: { type: 'town', id: 'dalniy' } }, // a third is refused
    );
    expect(ui.draft.observers).toHaveLength(2);
    ui = run(ui, { type: 'begin' });
    expect(ui.game.phase).toBe('quarter');

    let cards = 0;
    for (let guard = 0; ui.game.phase === 'quarter' && guard < 100; guard++) {
      const card = activeCard(ui.game);
      if (card) {
        cards += 1;
        ui = run(ui, { type: 'card', cardId: card.cardId, side: 'right' });
      } else {
        ui = run(ui, { type: 'tick' });
      }
    }
    expect(cards).toBeGreaterThanOrEqual(3);
    expect(ui.game.phase).toBe('desk');

    const reports = deskReports(ui.game);
    expect(reports).toHaveLength(5);
    for (const r of reports) ui = run(ui, { type: 'decide', reportId: r.id, decision: 'approve' });
    ui = run(ui, { type: 'file', inflate: 1.2 });
    expect(ui.reckoningSeen).toBe(false);
    expect(reckoning(ui.game)?.quarter).toBe(1);
    ui = run(ui, { type: 'continue' });
    expect(ui.game.phase).toBe('plan');
    expect(ui.game.quarter).toBe(2);
    // The next plan starts from the last one with the observers taken down.
    expect(ui.draft.observers).toHaveLength(0);
  });

  it('ignores ticks while paused and pauses at a card', () => {
    let ui = run(initialState(3), { type: 'start' }, { type: 'begin' }, { type: 'pause' });
    const before = ui.game.tick;
    ui = run(ui, { type: 'tick' });
    expect(ui.game.tick).toBe(before);
    ui = run(ui, { type: 'pause' });
    ui = run(ui, { type: 'tick' });
    expect(ui.game.tick).toBe(before + 1);
  });
});

describe('track geometry', () => {
  it('moves by time, so a two-tick leg is slower than a one-tick leg', () => {
    // junction -> oblastgrad takes 1 tick, oblastgrad -> kovrino takes 2.
    const track = trackOf(['junction', 'oblastgrad', 'kovrino']);
    expect(track.totalTicks).toBe(3);
    const atOneThird = distanceAt(track, 1 / 3);
    expect(atOneThird).toBeCloseTo(track.len[0]!, 5);
    const halfWay = distanceAt(track, 2 / 3);
    expect(halfWay).toBeCloseTo(track.len[0]! + track.len[1]! / 2, 5);
    const p = pointAt(track, track.totalLen);
    expect(p.x).toBeCloseTo(track.pts[2]!.x, 5);
  });

  it('the map exposes trains with a path the geometry can follow', () => {
    let ui = run(initialState(5), { type: 'start' }, { type: 'begin' });
    for (let i = 0; i < 4 && ui.game.phase === 'quarter'; i++) {
      const card = activeCard(ui.game);
      ui = card
        ? run(ui, { type: 'card', cardId: card.cardId, side: 'left' })
        : run(ui, { type: 'tick' });
    }
    const trains = visibleMap(ui.game).trains;
    expect(trains.length).toBeGreaterThan(0);
    for (const t of trains) {
      expect(trackOf(t.path).totalLen).toBeGreaterThan(0);
      expect(t.progress).toBeGreaterThanOrEqual(0);
      expect(t.progress).toBeLessThanOrEqual(1);
    }
  });
});
