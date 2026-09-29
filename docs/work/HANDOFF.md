# Session handoff (2026-09-29)

Read this first, then `CLAUDE.md`, `docs/work/milestone-2.md` and `docs/work/playtest-feedback.md`.

## What this project is

Comrade Planner: a mobile-first web game where you plan a small fictional Soviet-style province and everyone lies to you. The map shows what really happens (trains, trucks, queues, smoke), the desk shows what managers claim, and cards bring tips and petitions. Four bars (People, Apparatus, Centre, Shadow) end the run at either extreme, Reigns-style. It grew out of Peter's question of whether any intelligence could run a planned economy; his view is that the knowledge problem, not intelligence, is what breaks it, and the game is built to make that felt.

## Where things are

- Repo: `peteroomen/comrade-planner`, branch `main`, everything pushed.
- Design doc (Claude Docs): "Comrade Planner: Game Design" at https://claude.ai/code/artifact/4a6b6314-c4ac-4fd7-b862-100f1fddb733. It includes the office log section and resolved open questions (4 rival regions with migration as score; reform path parked for an expansion; 20 to 30 quarters as a working run length, now superseded by the survival targets; year-end review as a special event like the Reigns dungeon; starting fog still open and needs modelling).
- Early screen mockups (Design canvas): https://claude.ai/artifact/Kq68ZnGgN1qtCUruWSQ9HG
- Playable milestone 1 build (artifact): https://claude.ai/artifact/GbucTw2uuyBduDhRVExijk

## State

- Milestone 1 (`docs/work/milestone-1.md`) is complete: pure deterministic sim in `src/sim`, content in `src/content`, React + SVG UI in `src/ui`. 30 tests, lint, typecheck, build and a Playwright play-test (`npm run playtest`) all pass. Screenshots in `docs/screenshots/`.
- Peter played one quarter plus a bit. His feedback is triaged in `docs/work/playtest-feedback.md` (items 1–8 plus roadmap). Agreed decisions there are marked "agreed".
- Milestone 2 is written as a **proposal** in `docs/work/milestone-2.md`. Confirm scope with Peter before building. Peter's instruction was to fix the feedback while building the next slice.

## How we worked (keep doing this)

- Peter's workflow: plan in `docs/work/*.md`, confirm, implement in focused phases, run lint/typecheck/tests before calling a phase done. Use the `@/*` alias.
- Implementation was delegated to Sonnet 5.5 agents (Agent tool, `model: "sonnet"`) with tight briefs that point at the plan files; the orchestrating session reviewed the sim (money conservation, visibility rules) before any UI was built on it, then ran the checks itself and looked at screenshots.
- Agents commit but don't push; the orchestrator reviews, then pushes. Commit messages end with the attribution lines from the session's system reminder.
- Hard rules: `src/sim` never imports UI, never uses `Math.random`; money only moves through the ledger; UI never reads hidden truth except through selectors (observers, audits, railway manifests are the honest channels).

## Publishing the playable build

The build is published as an artifact so Peter can play on his phone:

1. `npx vite build --base=./ --outDir <scratchpad>/play`
2. Write `<scratchpad>/play/page.html` containing only: `<title>Comrade Planner</title>`, the Google Fonts `<link>` from `index.html`, `<link rel="stylesheet" href="./assets/<css file>">`, a small `<style>` setting a dark body background, `<div id="root"></div>`, and `<script type="module" src="./assets/<js file>"></script>` (no doctype/html/head/body; the publisher adds them).
3. Publish with the Artifact tool, `files` mapping `assets/<name>` to the built files. To update the existing build, pass `url: https://claude.ai/artifact/GbucTw2uuyBduDhRVExijk` (read it first, as the tool requires).

## Useful dev hooks

`?seed=<n>` fixes the RNG seed and `?tickms=<ms>` speeds up the live quarter. Balance constants are all in `src/sim/balance.ts`.

## Open questions for Peter

- Confirm the milestone 2 scope (especially whether the office log and the laptop layout wait for milestone 3).
- How much map fog at the start; this is on hold until the balance harness exists to model it.
