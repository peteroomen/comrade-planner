# Comrade Planner

A mobile-first web game: you are the planner of a small Soviet-style province, and everyone lies to you.
You set quotas, wages and prices, watch trains carry grain and steel across the map, then sit at the desk
and decide which of your managers' reports to believe. Four bars (People, Apparatus, Centre, Shadow) decide
how long you last.

Status: milestone 1, **phase A (simulation core)** is done. The game UI (phase B) is not built yet;
`src/ui/App.tsx` is a placeholder. The full spec is in `docs/work/milestone-1.md`.

## Run it

```sh
npm install
npm run dev        # Vite dev server (placeholder page for now)
npm test           # Vitest; the 20-quarter headless run logs the bars per quarter
npm run lint       # ESLint (flat config); also enforces the sim/ui boundary
npm run typecheck  # tsc --noEmit, strict
npm run build      # typecheck + production build
```

## Folder layout

```
src/sim/       pure, deterministic simulation. No React, DOM, Math.random or src/ui imports.
  facade.ts      the API the UI calls: newGame, setPlan, tick, chooseCard, decideReport, ...
  selectors.ts   what the player may see: visibleMap, pendingReports, bars, pins, observerFindings, ...
  balance.ts     every tunable coefficient, named and commented
  quarter.ts     turn loop: begin quarter, weekly step, quarter end, ratchet, bars
  world.ts       one week of the economy (wages, production, shipping, shopping, decay)
  rng.ts ledger.ts households.ts production.ts shipments.ts graph.ts managers.ts reports.ts
  observers.ts bars.ts cards.ts effects.ts tips.ts plan.ts init.ts stats.ts types.ts
src/content/   static data: map layout, enterprises, towns, characters, the card deck
src/ui/        React UI (phase B)
docs/work/     plans and specs
```

## How the sim is used

State is plain JSON-safe data with a seeded RNG inside it, so the same seed and inputs give an identical run.
Every facade call clones its input and returns a new state; calls made in the wrong phase return the state
unchanged.

```ts
let s = newGame(1234);
s = setPlan(s, defaultPlan()); // commits the plan and begins the quarter
while (s.phase === 'quarter') {
  const card = activeCard(s);
  s = card ? chooseCard(s, card.cardId, 'left') : tick(s);
}
for (const r of pendingReports(s)) s = decideReport(s, r.id, 'approve');
s = fileOwnReport(s, 1.0);
s = endQuarter(s); // reckoning(s) describes what happened
```

Money moves only through the ledger (`src/sim/ledger.ts`) and total money is conserved every tick
(`assertConserved`, checked every tick in dev and test builds).
