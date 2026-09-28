# Milestone 1: playable vertical slice

Status: approved by Peter (2026-09-29). Build in two phases: **A. simulation core**, then **B. game UI**. Phase B starts only after phase A is reviewed.

Design source: the "Comrade Planner: Game Design" doc. This brief is the build spec; where they differ, this brief wins for milestone 1.

## Goal

Prove the turn loop is fun: plan on the map, watch a live quarter with trains and cards, judge reports at the desk, see the bars move. Not polished, not balanced, but playable end to end on a phone-sized browser.

## Out of scope (do not build)

Rival regions, migration scoring, the office log, year-end review event, LLM or AI planners, reform path, save/load, sound, seasons beyond a simple palette tint, localisation, backend.

## Stack

- TypeScript (strict), Vite, React 18, Vitest, ESLint + Prettier.
- Map drawn as **SVG in React**, animated with `requestAnimationFrame`. No PixiJS for now.
- Path alias `@/*` → `src/*` (tsconfig + vite).
- Plain CSS modules or a single global stylesheet; no UI framework.
- Scripts: `dev`, `build`, `test`, `lint`, `typecheck`. All must pass before a phase is done.

## Layout

```
src/sim/      pure simulation, NO imports from react, dom, or src/ui
src/ui/       React components, map, desk, cards
src/content/  static data: map layout, enterprises, card deck, characters
docs/work/    plans (this file)
```

Enforce the boundary with an ESLint `no-restricted-imports` rule on `src/sim/**`.

## Phase A: simulation core (`src/sim`)

Pure, deterministic, serialisable. `step(state, input) => state` style; no classes with hidden mutable state, no `Math.random` (use a seeded RNG stored in state, e.g. mulberry32). Same seed + same player inputs = identical run.

### World

- Time: 1 tick = 1 week, 13 ticks = 1 quarter.
- 3 towns: **Dal'niy**, **Kovrino**, **Oblastgrad** (the provincial seat). Each has a population (households), a state shop, and a stock of goods.
- 4 goods (plus labour):
  - **grain**: food, perishable (a share spoils each tick in storage), households need it every tick
  - **steel**: industrial input; produced locally and also shipped in by the Centre
  - **tractors**: capital good; tractors at a farm raise its grain output
  - **consumer goods**: optional household want; low supply drives the black market
- 6 enterprises, each in or near a town, with a manager:
  - Lesnoy Farm, Kolos Farm (grain; inputs labour + tractors)
  - Stal Steel Mill (steel; input labour)
  - Krasny Tractor Works (tractors; inputs labour + steel), Director Volkov
  - Zarya Textile Works (consumer goods; inputs labour + steel)
  - Kovrino Distillery is **not** registered; black market production only (see Shadow)
- Rail network: a small graph of stations; goods move between enterprises and towns as **shipments** with an origin, destination, cargo, departure tick and travel time. The UI animates these. Shipments are real state, not decoration.
- Production: simple diminishing-returns function per enterprise, e.g. `output = A * labour^a * input^b`, capped by input availability. Keep formulas in one file with named constants.

### Households

Around 100 households split across towns. Each has hidden, slowly drifting preferences (weight on consumer goods vs saving) and a skill level. They work at an assigned enterprise, earn the planned wage, buy grain and consumer goods at state shop prices when stock exists, and turn to the black market when it doesn't (paying black market prices). Unmet grain need hurts the People bar.

### Money and the ledger

- Money is a strict double-entry ledger: every transfer has a from-account and to-account. Accounts: each household, each enterprise, each town shop, the province treasury, the Centre, the black market.
- Total money must be identical after every tick. Write a helper `assertConserved(state)` and call it in tests (and in dev builds every tick).
- The planner (player) sets: wage level per enterprise, state shop price per good.

### Managers and reports (the lying)

- Each manager has hidden traits: `honesty` (0–1) and `greed` (0–1), plus a hidden **skim**: a share of inputs or outputs diverted to the black market or a private warehouse.
- At quarter end each enterprise files a **report**: quota, reported output, inputs consumed, workers, next-quarter input request. Reports are the truth distorted by the manager's traits (inflated output, inflated input use to hide skimming, padded requests). Keep the true values in state so observers and audits can reveal them.
- The Apparatus bar raises the chance and size of distortion when low (they sabotage) and captures inspectors when high.

### Player inputs (per quarter)

- **Plan** (before the quarter): quota per enterprise, allocation of steel between Krasny and Zarya, grain allocation between towns, wages, shop prices, placement of up to 2 **observers** (on an enterprise or town).
- **Card choices** during the quarter (left/right).
- **Desk decisions** after the quarter: per report `approve | reject | audit`. Audits consume one inspector (inspectors available depends on the Centre bar), resolve next quarter, and reveal truth unless the inspector is corrupt (chance rises with Apparatus).
- **Own report upward**: an inflate factor from 1.0 (honest) to 1.5.

### Observers

An observer on a location records the true figures there for that quarter (true output, true stock, true shipments in and out). Exact numbers only come from observers, audits and reports; the map shows ambient cues only.

### The four bars (0–100, start at 50)

| Bar | Driven up by | Driven down by | Feeds back into |
| --- | --- | --- | --- |
| People | Fed households, consumer goods, fair wages | Grain shortage, queues, low wages | Labour productivity |
| Apparatus | Approving padded reports, granting requests | Rejections, audits that catch managers | Report distortion, inspector reliability |
| Centre | Meeting quota as reported upward, honest-looking numbers | Missed quota, caught inflation | Steel shipped in, inspectors available |
| Shadow | Unmet demand, skimming, tolerating tips | Crackdowns (cards), full shops | Number of tips, share of output leaking away |

A bar at 0 or 100 ends the run with a cause string (e.g. `"people-low"`). Keep all coefficients in one `balance.ts` file with named constants so they can be tuned.

Ratchet: the Centre raises next year's quota towards what was **reported upward**, so inflating now hurts later.

### Cards

- Content-driven deck in `src/content/cards.ts`: each card has an id, a character, text, a condition (predicate over state), and left/right choices with effects (bar deltas, state changes, and for tips, a map pin).
- Card types for milestone 1: **petition** (a request, moves bars), **tip** (an informant claims something about a location; it is true or false depending on real state and the informant's reliability; accepting drops a pin), **event** (something happened, e.g. a rail delay).
- Informants have a hidden reliability and a visible track record (right/wrong counts, updated when an observer or audit later confirms or contradicts the tip).
- Around 20 cards is enough. 3 to 5 are drawn per quarter, spaced across the ticks.

### API for the UI

Expose a small facade: `newGame(seed)`, `setPlan(state, plan)`, `tick(state)` (one week), `chooseCard(state, cardId, side)`, `decideReport(state, reportId, decision)`, `fileOwnReport(state, inflate)`, `endQuarter(state)`, plus selectors for what the player may see (`visibleMap(state)`, `pendingReports(state)`, `bars(state)`, `pins(state)`, `observerFindings(state)`). Selectors must never leak hidden truth except through observers and audits.

### Phase A tests (Vitest)

- Money is conserved over 200 ticks with random but valid player inputs.
- Determinism: two runs with the same seed and inputs produce deep-equal states.
- No negative stocks or balances.
- Bars stay within 0–100 and the run ends when one hits an edge.
- A fully honest manager (honesty 1, greed 0) reports the truth exactly.
- Observers reveal true values; `visibleMap` does not expose hidden fields.
- A headless 20-quarter run with a naive fixed plan completes without throwing (log the bars each quarter to the console in that test so balance can be eyeballed).

## Phase B: game UI (`src/ui`)

Portrait, designed at 390×844, usable from 360 wide up to desktop (centre the column on wide screens).

### Look

Vintage Soviet planning map: aged paper background, ink lines, hand-lettered feel. Fonts from Google Fonts: Oswald (headings), Courier Prime (documents, figures), Source Serif 4 (body). Palette: paper #EFE6D2, ink #1C1A17, red #B3261E, muted wagon colours per good. Fictional places only; call the capital "the Centre".

### Screens and flow

1. **Map (home)**: province map in SVG. Enterprises as red stars with small labels, towns as ink blocks, rail as the black-and-white dashed line. Bars across the top (People, Apparatus, Centre, Shadow). Shows the phase and quarter.
2. **Plan phase (paused)**: tap an enterprise or town to open a bottom sheet with its plan controls (quota, wage, allocation, shop prices). Place up to 2 observer pins. "Begin quarter" button.
3. **Live quarter**: runs 13 ticks over about 75 seconds (pause button, 2× speed button). Animated live layer, all driven by sim state:
   - trains: small wagon blocks sliding along the rail, filled by good; **solid when loaded, hollow when empty**
   - night trucks: dotted pencil lines along back roads to Kovrino that fade, scaled to black market volume
   - queues: tally marks beside a town shop, scaled to unmet demand
   - smoke: a hatched plume over an enterprise's star, absent when idle
   - emigrant footprints heading for the map edge when People is low
   - tip pins with a short label; observer pins as clipped paper slips showing typed figures
   Cards interrupt: the quarter pauses, a Reigns-style card slides up (swipe or tap left/right). Dots above bars hint which bars a choice moves (not by how much).
4. **Desk (paused)**: one report at a time on a typewritten form. Show supporting documents when available (rail manifest from shipments, observer slip, earlier report). Approve / Reject / Audit stamps. Then the own-report screen with an inflate slider.
5. **Reckoning**: bars animate to new values; a short list of what happened (only things the player could know). Continue to the next plan phase.
6. **Epitaph**: when a bar hits an edge, a card with the ending, quarters served, and "Start again".

### Phase B checks

Typecheck, lint, tests pass; `npm run build` succeeds; a full quarter can be played in the browser at 390×844 without console errors.

## Definition of done

Both phases complete, all scripts pass, a `README.md` explains how to run it, and `CLAUDE.md` records the workflow and the sim/ui boundary.
