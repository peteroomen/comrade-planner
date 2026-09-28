import { describe, expect, it } from 'vitest';
import { ENTERPRISE_IDS } from '@/content/ids';
import { BAR_IDS } from '@/content/ids';
import { CARDS } from '@/content/cards';
import { assertConserved } from './ledger';
import {
  chooseCard,
  decideReport,
  defaultPlan,
  endQuarter,
  fileOwnReport,
  newGame,
  setPlan,
  tick,
} from './facade';
import {
  activeCard,
  bars,
  deskReports,
  observerFindings,
  pendingReports,
  pins,
  visibleMap,
} from './selectors';
import { naiveDriver, playQuarter, playQuarters, randomDriver } from './test-utils';
import type { GameState } from './types';

describe('money and stocks', () => {
  it('conserves money over 200 ticks with random valid inputs', () => {
    const driver = randomDriver(99);
    // Random play often ends a run early, so start a fresh game until 200 ticks have been played.
    let played = 0;
    let seed = 7;
    let guard = 0;
    while (played < 200 && guard++ < 60) {
      let s = newGame(seed++);
      const total = s.ledger.total;
      while (s.phase !== 'ended' && played < 200) {
        const before = s.tick;
        s = playQuarter(s, driver);
        played += s.tick - before;
        assertConserved(s);
        expect(s.ledger.total).toBe(total);
      }
    }
    expect(played).toBeGreaterThanOrEqual(200);
  });

  it('never lets stocks or balances go negative', () => {
    for (const seed of [1, 2, 3]) {
      const driver = randomDriver(seed * 11);
      let s = newGame(seed);
      for (let q = 0; q < 8 && s.phase !== 'ended'; q++) {
        s = setPlan(s, driver.plan(s, q));
        while (s.phase === 'quarter') {
          s = s.activeCard ? chooseCard(s, s.activeCard.cardId, 'right') : tick(s);
          for (const v of Object.values(s.ledger.balances)) expect(v).toBeGreaterThanOrEqual(0);
          for (const t of Object.values(s.towns))
            for (const g of Object.values(t.stock)) expect(g).toBeGreaterThanOrEqual(0);
          for (const e of Object.values(s.enterprises)) {
            for (const g of Object.values(e.stock)) expect(g).toBeGreaterThanOrEqual(0);
            expect(e.tractors).toBeGreaterThanOrEqual(0);
          }
        }
        if (s.phase === 'desk') {
          for (const r of deskReports(s)) s = decideReport(s, r.id, driver.decide(s, r.id));
          s = endQuarter(s);
        }
      }
    }
  });
});

describe('determinism and serialisation', () => {
  it('produces deep-equal states for the same seed and inputs', () => {
    const a = playQuarters(42, 6, randomDriver(5));
    const b = playQuarters(42, 6, randomDriver(5));
    expect(a).toEqual(b);
    const c = playQuarters(43, 6, randomDriver(5));
    expect(c).not.toEqual(a);
  });

  it('survives a JSON round trip mid-run', () => {
    let s = newGame(3);
    s = setPlan(s, defaultPlan());
    for (let i = 0; i < 5 && s.phase === 'quarter'; i++) {
      s = s.activeCard ? chooseCard(s, s.activeCard.cardId, 'left') : tick(s);
    }
    const copy = JSON.parse(JSON.stringify(s)) as GameState;
    expect(copy).toEqual(s);
    // Continuing from the copy gives the same future as continuing from the original.
    const next = (x: GameState) =>
      x.activeCard ? chooseCard(x, x.activeCard.cardId, 'right') : tick(x);
    expect(next(copy)).toEqual(next(s));
  });
});

describe('bars', () => {
  it('stay within 0..100 and the run ends when one hits an edge', () => {
    let ended = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const driver = randomDriver(seed);
      for (const s of playQuarters(seed, 30, driver)) {
        for (const b of BAR_IDS) {
          expect(s.bars[b]).toBeGreaterThanOrEqual(0);
          expect(s.bars[b]).toBeLessThanOrEqual(100);
        }
        const edge = BAR_IDS.find((b) => s.bars[b] <= 0 || s.bars[b] >= 100);
        if (edge) {
          expect(s.phase).toBe('ended');
          expect(s.ended?.cause).toMatch(new RegExp(`^${edge}-(low|high)$`));
          ended++;
        }
      }
    }
    // Random play is reckless enough that some seeds must end.
    expect(ended).toBeGreaterThan(0);
  });

  it('ends with a cause when a bar is forced to 0', () => {
    let s = newGame(1);
    s = setPlan(s, defaultPlan());
    s.bars.people = 0.5;
    s.activeCard = { cardId: 'petition-stal-bonus', tick: 1, veracity: null };
    s = chooseCard(s, 'petition-stal-bonus', 'left'); // people -3
    expect(s.phase).toBe('ended');
    expect(s.ended?.cause).toBe('people-low');
  });
});

describe('managers and reports', () => {
  it('a fully honest manager reports the truth exactly', () => {
    let s = newGame(11);
    for (const e of ENTERPRISE_IDS) {
      s.managers[e].honesty = 1;
      s.managers[e].greed = 0;
    }
    s.bars.apparatus = 10; // even with a crumbling Apparatus
    s = setPlan(s, defaultPlan());
    let guard = 0;
    while (s.phase === 'quarter' && guard++ < 100) {
      s = s.activeCard ? chooseCard(s, s.activeCard.cardId, 'right') : tick(s);
    }
    expect(s.phase === 'desk' || s.phase === 'ended').toBe(true);
    if (s.phase === 'desk') {
      const reports = s.reports.filter((r) => r.quarter === s.quarter);
      expect(reports).toHaveLength(ENTERPRISE_IDS.length);
      for (const r of reports) {
        expect(r.reportedOutput).toBe(r.truth.output);
        expect(r.reportedInputs).toBe(r.truth.inputs);
        expect(r.workers).toBe(r.truth.workers);
        expect(r.requestNext).toBe(r.truth.request);
      }
    }
  });

  it('dishonest managers distort on average, and low Apparatus makes it worse', () => {
    const inflation = (apparatus: number): number => {
      let sum = 0;
      let n = 0;
      for (let seed = 1; seed <= 10; seed++) {
        let s = newGame(seed);
        s.bars.apparatus = apparatus;
        s = setPlan(s, defaultPlan());
        let guard = 0;
        while (s.phase === 'quarter' && guard++ < 100) {
          s = s.activeCard ? chooseCard(s, s.activeCard.cardId, 'right') : tick(s);
          // Keep the bar pinned so the comparison is clean.
          s.bars.apparatus = apparatus;
        }
        if (s.phase !== 'desk') continue;
        for (const r of s.reports.filter((x) => x.quarter === s.quarter)) {
          sum += r.reportedOutput / Math.max(1, r.truth.output);
          n++;
        }
      }
      return sum / n;
    };
    const healthy = inflation(80);
    const crumbling = inflation(15);
    expect(healthy).toBeGreaterThan(1);
    expect(crumbling).toBeGreaterThan(healthy);
  });
});

describe('audits', () => {
  it('spend inspectors, resolve next quarter, and reveal the truth via the selectors', () => {
    let s = newGame(21);
    s.bars.apparatus = 5; // very low, so distortion is likely and inspectors seldom captured
    s.bars.apparatus = 5;
    s = setPlan(s, defaultPlan());
    let guard = 0;
    while (s.phase === 'quarter' && guard++ < 100) {
      s = s.activeCard ? chooseCard(s, s.activeCard.cardId, 'right') : tick(s);
      s.bars.apparatus = Math.max(s.bars.apparatus, 5);
    }
    expect(s.phase).toBe('desk');
    const first = deskReports(s)[0];
    expect(first).toBeDefined();
    const before = s.inspectorsLeft;
    expect(before).toBeGreaterThan(0);
    s = decideReport(s, first!.id, 'audit');
    expect(s.inspectorsLeft).toBe(before - 1);
    expect(s.audits[0]?.status).toBe('pending');
    // Cannot audit more than the inspectors available.
    for (const r of deskReports(s)) s = decideReport(s, r.id, 'audit');
    expect(s.inspectorsLeft).toBeGreaterThanOrEqual(0);
    s = endQuarter(s);
    expect(s.audits.every((a) => a.status === 'pending')).toBe(true);
    // Next quarter: the audit resolves at filing time.
    s = playQuarterToDesk(s);
    expect(s.audits.some((a) => a.status === 'resolved')).toBe(true);
    const resolved = s.audits.find((a) => a.status === 'resolved');
    expect(resolved?.finding).not.toBeNull();
  });
});

function playQuarterToDesk(start: GameState): GameState {
  let s = setPlan(start, defaultPlan());
  let guard = 0;
  while (s.phase === 'quarter' && guard++ < 100) {
    s = s.activeCard ? chooseCard(s, s.activeCard.cardId, 'right') : tick(s);
  }
  return s;
}

describe('observers and visibility', () => {
  it('observers reveal the true figures at their location', () => {
    let s = newGame(5);
    const plan = defaultPlan();
    plan.observers = [
      { type: 'enterprise', id: 'lesnoy' },
      { type: 'town', id: 'oblastgrad' },
    ];
    s = setPlan(s, plan);
    let guard = 0;
    let grossLesnoy = 0;
    while (s.phase === 'quarter' && guard++ < 100) {
      if (s.activeCard) {
        s = chooseCard(s, s.activeCard.cardId, 'right');
        continue;
      }
      s = tick(s);
      grossLesnoy += s.enterprises.lesnoy.lastProduced;
    }
    expect(s.phase).toBe('desk');
    const found = observerFindings(s);
    expect(found).toHaveLength(2);
    const lesnoy = found.find((f) => f.target.type === 'enterprise' && f.target.id === 'lesnoy');
    expect(lesnoy).toBeDefined();
    expect(lesnoy!.output).toBeCloseTo(grossLesnoy, 0);
    const town = found.find((f) => f.target.type === 'town');
    const truthStock = s.towns.oblastgrad.stock;
    expect(town!.stock.grain).toBeCloseTo(truthStock.grain, 0);
    expect(town!.shippedIn.grain).toBeGreaterThan(0);
    expect(lesnoy!.shippedOut.grain).toBeGreaterThan(0);
  });

  it('a skimming manager shows up as a gap between observed output and shipments', () => {
    let s = newGame(5);
    s.managers.kolos.honesty = 0;
    s.managers.kolos.greed = 1;
    const plan = defaultPlan();
    plan.observers = [{ type: 'enterprise', id: 'kolos' }];
    s = setPlan(s, plan);
    let guard = 0;
    while (s.phase === 'quarter' && guard++ < 100) {
      s = s.activeCard ? chooseCard(s, s.activeCard.cardId, 'right') : tick(s);
    }
    const kolos = observerFindings(s)[0]!;
    expect(kolos.output).toBeGreaterThan(kolos.shippedOut.grain);
  });

  it('visibleMap and the other selectors never expose hidden fields', () => {
    const hidden = [
      'honesty',
      'greed',
      'skim',
      'reliability',
      'veracity',
      'warehouse',
      'corrupt',
      'truth',
      'trueOutput',
      'prefConsumer',
    ];
    let s = newGame(8);
    const plan = defaultPlan();
    plan.observers = [{ type: 'enterprise', id: 'kolos' }];
    s = setPlan(s, plan);
    let guard = 0;
    const check = (label: string) => {
      const blob = JSON.stringify({
        map: visibleMap(s),
        bars: bars(s),
        pins: pins(s),
        obs: observerFindings(s),
        card: activeCard(s),
        pending: pendingReports(s),
        desk: deskReports(s),
      });
      for (const key of hidden) expect(blob, `${label}: leaked ${key}`).not.toContain(`"${key}"`);
    };
    while (s.phase === 'quarter' && guard++ < 100) {
      check('quarter');
      s = s.activeCard ? chooseCard(s, s.activeCard.cardId, 'right') : tick(s);
    }
    check('desk');
    for (const r of deskReports(s)) s = decideReport(s, r.id, 'audit');
    check('after audit');
    s = endQuarter(s);
    check('next plan');
    // Ambient cues are coarse: no exact quantities on the map.
    const map = visibleMap(s);
    for (const t of map.trains) expect([1, 2, 3]).toContain(t.size);
    for (const t of map.towns) expect([0, 1, 2, 3]).toContain(t.queue);
  });

  it('reports reflect filed figures only; the reported output is not the truth for a liar', () => {
    let s = newGame(2);
    s.managers.kolos.honesty = 0;
    s.managers.kolos.greed = 1;
    s.bars.apparatus = 20;
    let found = false;
    for (let q = 0; q < 4 && !found; q++) {
      s = playQuarterToDesk(s);
      if (s.phase !== 'desk') break;
      const r = s.reports.find((x) => x.enterprise === 'kolos' && x.quarter === s.quarter)!;
      const pub = deskReports(s).find((x) => x.enterprise === 'kolos')!;
      expect(pub.reportedOutput).toBe(Math.round(r.reportedOutput));
      if (r.reportedOutput > r.truth.output * 1.05) found = true;
      s = endQuarter(s);
      s.bars.apparatus = 20;
    }
    expect(found).toBe(true);
  });
});

describe('cards and informants', () => {
  it('draws 3 to 5 cards per quarter, spaced across the quarter', () => {
    for (let seed = 1; seed <= 6; seed++) {
      let s = newGame(seed);
      s = setPlan(s, defaultPlan());
      const n = s.cardSchedule.length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
      const ticks = s.cardSchedule.map((c) => c.tick);
      expect(new Set(ticks).size).toBe(n);
      let shown = 0;
      let guard = 0;
      while (s.phase === 'quarter' && guard++ < 100) {
        if (s.activeCard) {
          shown++;
          s = chooseCard(s, s.activeCard.cardId, 'left');
        } else s = tick(s);
      }
      expect(shown).toBeLessThanOrEqual(n);
      expect(shown).toBeGreaterThanOrEqual(1);
    }
  });

  it('pauses the quarter until a card is answered', () => {
    let s = setPlan(newGame(4), defaultPlan());
    let guard = 0;
    while (!s.activeCard && s.phase === 'quarter' && guard++ < 100) s = tick(s);
    expect(s.activeCard).not.toBeNull();
    const week = s.week;
    expect(tick(s)).toBe(s);
    expect(s.week).toBe(week);
    s = chooseCard(s, s.activeCard!.cardId, 'right');
    expect(s.activeCard).toBeNull();
  });

  it('ships about 20 cards of all three kinds', () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(18);
    for (const type of ['petition', 'tip', 'event'] as const) {
      expect(CARDS.filter((c) => c.type === type).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('accepting a tip drops a pin; an observer later updates the informant track record', () => {
    let s = newGame(9);
    s.managers.kolos.honesty = 0;
    s.managers.kolos.greed = 1;
    s.informants.nina!.reliability = 1;
    const plan = defaultPlan();
    plan.observers = [{ type: 'enterprise', id: 'kolos' }];
    s = setPlan(s, plan);
    // Force a known tip: Baba Nina says Kolos skims at night.
    s.activeCard = { cardId: 'tip-kolos-night-trucks', tick: 1, veracity: true };
    s = chooseCard(s, 'tip-kolos-night-trucks', 'right');
    expect(s.pins).toHaveLength(1);
    expect(pins(s)[0]?.status).toBe('open');
    expect(pins(s)[0]?.informant.right).toBe(0);
    s.cardSchedule = []; // no further interruptions
    let guard = 0;
    while (s.phase === 'quarter' && guard++ < 100) s = tick(s);
    expect(s.phase).toBe('desk');
    expect(pins(s)[0]?.status).toBe('confirmed');
    expect(pins(s)[0]?.informant.right).toBe(1);
    expect(pins(s)[0]?.informant.wrong).toBe(0);
  });

  it('a pin nobody checks stays open and the track record does not move', () => {
    let s = newGame(9);
    s.managers.kolos.honesty = 0;
    s.managers.kolos.greed = 1;
    s = setPlan(s, defaultPlan());
    s.activeCard = { cardId: 'tip-kolos-night-trucks', tick: 1, veracity: true };
    s = chooseCard(s, 'tip-kolos-night-trucks', 'right');
    s.cardSchedule = [];
    let guard = 0;
    while (s.phase === 'quarter' && guard++ < 100) s = tick(s);
    expect(pins(s)[0]?.status).toBe('open');
    expect(pins(s)[0]?.informant).toMatchObject({ right: 0, wrong: 0 });
  });
});

describe('quota ratchet', () => {
  it('raises Centre targets toward what was reported upward at year end', () => {
    let s = newGame(6);
    const base = { ...s.centre.targets };
    const inflating = { ...naiveDriver, inflate: () => 1.5 };
    for (let q = 0; q < 4 && s.phase !== 'ended'; q++) s = playQuarter(s, inflating);
    if (s.phase !== 'ended') {
      const raised = ENTERPRISE_IDS.filter((e) => s.centre.targets[e] > base[e]);
      expect(raised.length).toBeGreaterThan(0);
    }
  });
});

describe('phases', () => {
  it('ignores calls made in the wrong phase', () => {
    const s = newGame(1);
    expect(tick(s)).toBe(s);
    expect(endQuarter(s)).toBe(s);
    expect(fileOwnReport(s, 1.2)).toBe(s);
    expect(decideReport(s, 1, 'approve')).toBe(s);
  });

  it('clamps plans into legal ranges', () => {
    let s = newGame(1);
    const plan = defaultPlan();
    plan.wage.stal = 9999;
    plan.prices.grain = -5;
    plan.observers = [
      { type: 'town', id: 'dalniy' },
      { type: 'town', id: 'dalniy' },
      { type: 'town', id: 'kovrino' },
      { type: 'town', id: 'oblastgrad' },
    ];
    s = setPlan(s, plan);
    expect(s.plan.wage.stal).toBeLessThanOrEqual(24);
    expect(s.plan.prices.grain).toBeGreaterThanOrEqual(1);
    expect(s.plan.observers).toHaveLength(2);
  });
});

describe('headless 20-quarter run', () => {
  it('completes with a naive fixed plan and logs the bars each quarter', () => {
    const history = playQuarters(2024, 20, naiveDriver);
    const lines: string[] = [];
    history.forEach((s, i) => {
      const b = s.reckoning?.barsAfter ?? s.bars;
      lines.push(
        `Q${String(i + 1).padStart(2)}  people ${b.people.toFixed(1).padStart(5)}  apparatus ${b.apparatus.toFixed(1).padStart(5)}  centre ${b.centre.toFixed(1).padStart(5)}  shadow ${b.shadow.toFixed(1).padStart(5)}${s.ended ? `  ENDED: ${s.ended.cause}` : ''}`,
      );
    });
    console.log(`Bars per quarter (naive fixed plan, seed 2024):\n${lines.join('\n')}`);
    expect(history.length).toBeGreaterThan(2);
    const last = history[history.length - 1]!;
    if (last.ended) expect(last.quarter).toBeGreaterThan(2);
    // Not perfectly flat: at least one bar moves by 5 or more over the run.
    const barsOf = (x: GameState) => x.reckoning?.barsAfter ?? x.bars;
    const moved = BAR_IDS.map((b) =>
      Math.max(...history.map((x) => Math.abs(barsOf(x)[b] - barsOf(history[0]!)[b]))),
    );
    expect(Math.max(...moved)).toBeGreaterThan(5);
    assertConserved(last);
  });
});
