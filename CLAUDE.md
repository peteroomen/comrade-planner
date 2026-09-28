# Comrade Planner

A mobile-first web game: you are the planner of a small Soviet-style province, and everyone lies to you.

## Workflow

1. Plan in `docs/work/*.md` before writing code; confirm the plan.
2. Implement in focused phases.
3. Before calling a phase done, run `npm run lint`, `npm run typecheck` and `npm test`.

## Architecture rules

- `src/sim/` is pure TypeScript: deterministic, seeded RNG in state, no React/DOM imports, no `Math.random`.
- `src/ui/` renders sim state and sends player inputs through the sim facade. It never reads hidden truth directly; use the visibility selectors.
- `src/content/` holds static data (map layout, enterprises, cards, characters).
- Money moves only through the ledger. Total money is conserved every tick.
- Balance constants live in `src/sim/balance.ts`.
- Use the `@/*` path alias for imports from `src/`.
