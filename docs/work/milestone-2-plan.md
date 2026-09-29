# Milestone 2: implementation plan

Status: **approved by Peter (2026-09-29).** Scope source: `docs/work/milestone-2.md` (the proposal) and `docs/work/playtest-feedback.md` items 1–8. This file turns the proposal into concrete, reviewable work packages. Anything not listed here stays out (see "Out of scope").

## How it gets built

- Each package below is one brief for a Sonnet 5.5 agent (`model: "sonnet"`), run in sequence on branch `ccr-67449f45-5ivfru`. The agent commits but does not push.
- After each package I review the diff myself before the next brief goes out: money conservation, no `Math.random`/UI imports in `src/sim`, UI only reads through selectors, hints never leak hidden truth, and the tests actually test the new rule. I run `npm run lint`, `npm run typecheck`, `npm test` (and `npm run balance` / `npm run playtest` once they apply), fix or send back anything wrong, then push.
- Sim packages (1–3) are reviewed and green before any UI package (4–5) starts, as in milestone 1.

## Package 1: balance harness (Phase A)

Goal: measure before tuning. No balance changes in this package.

- `src/sim/harness/drivers.ts`: the five archetypes as `Driver`s (extend the existing interface in `src/sim/test-utils.ts`, move shared pieces out of test-utils). Drivers use **only the facade and public selectors**, so "careful" proves a real player could do it. The random driver has its own small seeded RNG (not `Math.random`, not the game's RNG, so it never perturbs the sim).
  - random: random plan tweaks within legal ranges, random card sides, random stamps, random inflation.
  - naive: default plan, approve all, inflate 1.0, alternating card sides (today's `naiveDriver`).
  - trusting: naive plan, approve all, the "grant" side of every petition.
  - careful: places observers on the two enterprises it trusts least; audits reports whose manifest or observer finding disagrees with the claim; rejects reports an audit already caught; raises grain allocation to towns with queues or shortage findings; nudges consumer price/quota so shops fill; inflates 1.0. Uses the plan controls added in package 2 once they exist (crackdown, wage restraint).
  - inflater: naive plan, approve all, inflate 1.3–1.4.
- `src/sim/harness/run.ts`: `runArchetype(driver, seeds, maxQuarters = 40)` returning per-seed `{ quarters, cause | 'survived' }`. Runs censored at 40 quarters.
- `scripts/balance.ts`, run with `npm run balance` via `tsx` (new dev dependency; resolves the `@/*` alias from tsconfig). 300 seeds per archetype by default, `--seeds N` flag. Prints a compact table (median, p10, p90, share dead by Q3, share dead before Q6, histogram of death quarter, share of deaths by cause) and writes the same to `docs/balance/latest.md`.
- `src/sim/harness/harness.test.ts`: 50 seeds, asserts careful median > naive median > random median. Marked so it can be skipped locally if slow, but runs in `npm test`.
- If 1,500 full runs are too slow with `structuredClone` per tick, add an internal non-cloning step path used only by the harness (same functions, no clone) rather than changing the facade contract. Target: `npm run balance` under ~60 s.
- Deliverable includes the **baseline table** for the current milestone 1 balance, committed as `docs/balance/baseline-m1.md`, so we can see what later packages change.

## Package 2: sim mechanics (Phase B 1–3)

All new constants in `balance.ts`, one comment line each. Each rule gets a unit test.

### 2a. Desk: the right call is rewarded (item 6)

"Padded" keeps its current definition (`PADDED_TOLERANCE` on output or inputs vs truth).

- **Approve padded:** drop the Apparatus bonus for approving padding (`APPARATUS_PADDED_APPROVE` → small or 0, tuned). The padded share of an approved report is recorded on the quarter as hidden "approved padding". The Centre spot-check then judges **effective inflation** = (what went upward × own inflate) / true output, not only the player's own inflate slider. So approving a lie can get you caught even when you file honestly. The ratchet already uses upward figures, so fake numbers already raise targets; add a test that proves it.
- **Reject:** padded report → manager is "chastened": next quarter's distortion scaled by `REJECT_CHASTEN` (e.g. 0.4), small Apparatus cost. Honest report → larger Apparatus cost plus a People penalty (the works resent being called liars). Stored as a hidden field on `Manager`.
- **Audit caught (resolves next quarter, as today):** recover the manager's `warehouse` goods to the enterprise stock; cut that manager's greed and raise honesty (skim recomputed); Shadow down; Centre up; the existing Apparatus cost stays. A **clean** audit (honest report) costs a small extra Apparatus hit. A corrupt inspector still returns "fine" and triggers none of this.
- **Requests actually deliver (milestone 1 gap):** only Krasny and Zarya consume steel, so only their requests do anything. Approving their report grants `requestNext`: next quarter's steel split between the two factories is set from the granted requests (blended with the plan's `steelKrasnyShare`), capped by steel actually available. A padded request over-grants; the surplus lands in that manager's warehouse (more skim, more Shadow). Rejecting or auditing does not grant. Farms and Stal show their request as information only (UI label changes in package 4).

### 2b. Wages and the treasury (item 3)

- Selector `treasury(state)`: balance, Centre grant per week, wage bill per week, top-ups paid to enterprises this quarter. Treasury balance is public knowledge (it's the planner's own account).
- Track `stats.treasuryTopUp` and `stats.centreGrant`. At quarter end, if top-ups exceed the grant, Centre falls by `CENTRE_OVERSPEND_GAIN × overspend share`, with a reckoning line.
- Excess money: when household cash per household rises above what consumer goods on offer can absorb, black market prices rise and more consumer spending goes black. Shadow gains a term on `consumerBlack / consumerBought` share; People lose a little from consumer queues (a consumer-goods shortfall counter alongside grain queues).

### 2c. Shadow (item 8)

- **Crackdown order** in the plan: `plan.crackdown: TownId | null`. Costs People and Apparatus when the quarter begins; for that quarter the town's black market sales are cut by `CRACKDOWN_TOWN_CUT`, enterprises in that town skim at `CRACKDOWN_SKIM_MULT`, and Shadow falls at quarter end. Town-only for now (roads as targets would need route-level black trade the sim doesn't model yet). Repeating it in consecutive quarters costs more People.
- Existing `event-crackdown` card reuses the same effect.
- Add ~5 cards whose sides include Shadow down (militia raids, a manager offering to name a supplier, a kolkhoz chairman returning diverted goods for amnesty, closing a bazaar, a Party purge of a skimmer), each with a real cost on another bar.
- `shadowDelta`: skim contribution now reflects caught/chastened managers automatically; tune so a player who fills shops, audits well and cracks down once can pull Shadow down within 2–3 quarters (checked by the careful archetype's Shadow trace in the harness output).

## Package 3: effect hints and tuning (Phase B 4–5)

- `src/sim/hints.ts` + selectors. A hint is `{ bar, dir: 'up' | 'down', size: 'small' | 'large', when: 'now' | 'later' }`. Never exact numbers.
  - Cards: derived from `bars` effects (|Δ| ≥ `HINT_LARGE`, e.g. 5, is large) plus hand-written `later` hints for world effects (tractors → People later up, etc.) declared on the card choice in content.
  - Stamps: generic per decision, the same for every report, so they reveal nothing about padding. Approve: Apparatus up small now. Reject: Apparatus down now, and "depends" markers on People/Centre shown as uncertain. Audit: Apparatus down small now, Centre/Shadow uncertain later.
  - Plan controls: `planHints(committedPlan, draftPlan)` returns hints for each changed control from a static direction table (wage up → People up, productivity up, Centre down later if over budget; price up → People down, Shadow up; crackdown → People and Apparatus down now, Shadow down later; etc.).
  - Test: stamp hints are identical for a padded and an honest report (visibility rule).
- **Tuning:** iterate `balance.ts` against the harness until the targets hold:
  - random: often dead by Q2–3
  - naive: median ~5
  - careful: median ~11–15, rarely dead before Q6
  - no cause of death above ~40% of losses
  - careful clearly beats trusting and naive
- Commit the final table to `docs/balance/latest.md` and add a short "what changed and why" note in `docs/balance/notes.md`. The harness test's ordering assertion is tightened to include trusting.

## Package 4: map, bars, treasury, desk UI (Phase C 1–3, 5)

- **Roads vs rails:** rails black-and-white dashed; roads thin brown double lines; night trucks only on roads.
- **Bar markers:** Reigns-style up/down markers above the four bars, sized small/large, filled for "now", outlined for "later", "?" for uncertain. Shown while dragging a card, while pressing/hovering a stamp, and while a plan control is being changed. Replaces the neutral hint dots. Screen-reader text keeps working ("Raises People a lot").
- **Bar animation** when a choice lands; the reckoning lists delayed effects the player could know about (requests granted, audits pending, crackdown, overspend).
- **Treasury** in the header (balance and a small up/down trend), detail in the plan sheet next to wages.
- **Plan sheet:** crackdown picker (towns), request lines labelled "information only" for farms/Stal.
- **Known issues:** crowding around Oblastgrad on the map; farm sheet needing a scroll on phones.

## Package 5: tutorial (Phase C 4)

- Skippable guided first quarter: plan sheet, observer placement, first card, first report with its manifest, own report, reckoning. Coach marks over the real UI, not a separate mode; the sim runs normally underneath.
- "Seen" flag in `localStorage`, all reads/writes in try/catch; a "Replay tutorial" link on the title screen.
- `npm run playtest` extended to go through the tutorial once and to skip it once.

## Wrap-up (me)

- Full checks, `npm run build`, `npm run playtest`, fresh screenshots in `docs/screenshots/`.
- Update `docs/work/milestone-2.md` status, the handoff and the design doc's office log.
- Republish the playable build to the existing artifact (https://claude.ai/artifact/GbucTw2uuyBduDhRVExijk) following the steps in `HANDOFF.md`, for Peter to play.

## Out of scope (milestone 3)

Rival regions and migration scoring, the office log UI, the year-end review event, PC/laptop layout, starting map fog (the harness makes it modellable next), LLM planners, reform path.

## Decisions (confirmed by Peter)

1. Office log and laptop layout wait for milestone 3, as the proposal says.
2. Crackdown targets a town, not a road.
3. Only steel requests (Krasny, Zarya) are real; the others are information.
4. The tutorial is in this milestone, last, so it teaches the final mechanics.
5. The harness adds `tsx` as a dev dependency.
