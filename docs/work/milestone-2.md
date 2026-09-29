# Milestone 2: fair and legible (proposed)

Status: **proposed, confirm scope with Peter before building.** Source: `docs/work/playtest-feedback.md` (items 1–8 and roadmap). Milestone 1 spec: `docs/work/milestone-1.md`.

## Goal

Make every choice's consequence knowable in direction, make the right call always pay, and hit the agreed survival targets, proven by a balance harness rather than by feel.

## Phase A: balance harness (build first; everything after is tuned against it)

- `scripts/balance.ts` (or `src/sim/balance-harness.ts` with tests), run with `npm run balance`. Headless, uses only the sim facade.
- Archetypes: **random** (random plan tweaks, sides, stamps), **naive** (default plan, approve all, no inflation), **trusting** (approve all, grant all requests), **careful** (audits reports whose manifest or observer data disagree, raises grain allocation to short towns, fills shops), **inflater** (always inflates own report 1.3+).
- Output per archetype over at least 300 seeds: median and p10/p90 quarters survived, histogram of death quarter, share of deaths by cause (bar and end). Print a compact table; also write `docs/balance/latest.md` so results are diffable.
- Agreed targets (Peter, 2026-09-29):
  - random: often dead by Q2–3
  - naive: median about 5 quarters
  - careful: median about 11–15, rarely dead before Q6
  - no single cause of death above about 40% of losses
  - careful clearly outlasts trusting and naive (this is the check that the desk rewards the right call)
- Add a Vitest test that runs a small version (e.g. 50 seeds) and asserts the ordering careful > naive > random, so regressions fail CI.

## Phase B: mechanics fixes (sim)

1. **Desk (item 6).** Principle: the right call is always rewarded; a player may still choose wrong on purpose if the reward would push a bar over an edge.
   - Approving a padded report: its padding counts toward your own inflation for Centre spot-checks, and feeds the ratchet.
   - Audit that catches padding or skimming: recover skimmed goods to the enterprise, lower Shadow, cut that manager's skim and raise honesty, raise Centre. A clean audit costs a little Apparatus.
   - Reject padded: manager refiles closer to the truth next quarter (reduced distortion), small Apparatus cost. Reject honest: bigger Apparatus cost and a People or Centre penalty.
   - Approving a manager's input request actually delivers inputs next quarter (milestone 1 gap), taking them from allocations.
2. **Wages (item 3).** Treasury visible through a selector. Centre bar falls when the wage bill exceeds the budget it funds. Extra household money with no extra consumer goods raises black market prices, queues and Shadow.
3. **Shadow (item 8).** Crackdown order in the plan phase (target a town or road; costs People and Apparatus, lowers black market volume and Shadow). More cards with a Shadow-down side. Tune so good play can pull Shadow down within 2–3 quarters.
4. **Effect hints for the UI.** Expose, per card side, per desk stamp, and per plan control change, which bars move and in which direction with a magnitude bucket (small or large). Never exact numbers. Keep the visibility rule: hints may depend only on what the player can know (e.g. a stamp's hint cannot reveal whether the report is padded).
5. Retune `balance.ts` against the harness until Phase A targets hold. Record the final table in `docs/balance/latest.md`.

## Phase C: legibility and polish (UI)

1. **Roads vs rails (item 1).** Rails stay black-and-white dashed; roads are thin brown double lines; night trucks only on roads.
2. **Bar markers (items 4, 5).** Reigns-style up/down markers above bars, sized by magnitude, on cards (while dragging), desk stamps and plan controls. Animate bar changes when a choice lands. Reckoning lists delayed effects the player could know about.
3. **Treasury** shown in the header or plan sheet.
4. **Tutorial (roadmap).** Skippable guided first quarter: plan sheet, observer placement, first card, first report with its manifest, own report, reckoning. Stored as "seen" in localStorage (wrapped in try/catch).
5. Fix milestone 1 known issues: crowding around Oblastgrad, farm sheet needing a scroll on phones.

## Out of scope (milestone 3 candidates)

Rival regions and migration scoring, the office log, the year-end review event, PC/laptop layout (roadmap), LLM or AI planners, reform path.

## Definition of done

Lint, typecheck, tests, build and `npm run playtest` pass; `npm run balance` meets the targets and its table is committed; the published build is updated; Peter plays and confirms.
