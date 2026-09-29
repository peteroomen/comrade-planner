import { mkdirSync, writeFileSync } from 'node:fs';
import { ARCHETYPES } from '../src/sim/harness/drivers';
import { runArchetype, summarise } from '../src/sim/harness/run';
import type { Summary } from '../src/sim/harness/run';

// Balance harness: plays each archetype over many seeds and prints a compact table.
// Usage: npm run balance [-- --seeds N] [--out path] [--only random,naive]

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const seeds = Math.max(1, Math.floor(Number(flag('seeds') ?? 300)) || 300);
const out = flag('out') ?? 'docs/balance/latest.md';
const only = flag('only')?.split(',');
const MAX_QUARTERS = 40;

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const num = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function histogram(s: Summary): string {
  const parts: string[] = [];
  for (let q = 1; q < MAX_QUARTERS; q++) {
    const c = s.histogram[q];
    if (c) parts.push(`Q${q}:${c}`);
  }
  if (s.survived > 0) parts.push(`${MAX_QUARTERS}+:${Math.round(s.survived * s.n)}`);
  return parts.join(' ');
}

function causes(s: Summary): string {
  return (
    Object.entries(s.causes)
      .sort((a, b) => b[1] - a[1])
      .map(([c, v]) => `${c} ${pct(v)}`)
      .join(', ') || 'none'
  );
}

const started = Date.now();
const rows: { name: string; s: Summary; secs: number }[] = [];
for (const a of ARCHETYPES.filter((x) => !only || only.includes(x.name))) {
  const t = Date.now();
  const s = summarise(runArchetype(a.make, seeds, MAX_QUARTERS));
  rows.push({ name: a.name, s, secs: (Date.now() - t) / 1000 });
  console.error(`${a.name}: ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

const head = ['archetype', 'median', 'p10', 'p90', 'dead<=Q3', 'dead<Q6', 'survived'];
const table = [
  `| ${head.join(' | ')} |`,
  `| ${head.map(() => '---').join(' | ')} |`,
  ...rows.map(
    ({ name, s }) =>
      `| ${name} | ${num(s.median)} | ${num(s.p10)} | ${num(s.p90)} | ${pct(s.deadByQ3)} | ${pct(s.deadBeforeQ6)} | ${pct(s.survived)} |`,
  ),
];
const detail = rows.map(
  ({ name, s }) =>
    `### ${name}\n\n- Death quarter histogram (deaths): ${histogram(s) || 'none'}\n- Share of deaths by cause: ${causes(s)}`,
);
const md = [
  '# Balance harness results',
  '',
  `${seeds} seeds per archetype (seeds 1..${seeds}), runs censored at ${MAX_QUARTERS} quarters. Quarters are the quarter of death; survivors count as ${MAX_QUARTERS}.`,
  'Regenerate with `npm run balance`.',
  '',
  ...table,
  '',
  ...detail.flatMap((d) => [d, '']),
].join('\n');

console.log(md);
mkdirSync(out.includes('/') ? out.slice(0, out.lastIndexOf('/')) : '.', { recursive: true });
writeFileSync(out, md);
console.error(`total ${((Date.now() - started) / 1000).toFixed(1)}s, wrote ${out}`);
