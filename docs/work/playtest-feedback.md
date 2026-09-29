# Playtest feedback (milestone 1)

Triage only. Fixes land with the next slice.

| # | Feedback | Type | Proposed fix | Priority |
| --- | --- | --- | --- | --- |
| 1 | Can't tell roads from rails; only watching the rails | Visual clarity | Rails stay black-and-white dashed; roads become thin brown double lines; night trucks only on roads | High |
| 2 | Hard to know what consequences a choice will have; some confusion is good, some just confusing | Legibility | Direction-only effect hints on plan controls (like card bar markers); covered further by the tutorial (roadmap) | High |
| 3 | What do wages do? Any downside to raising them? | Design gap | Today: People and productivity up, only hidden cost is the treasury. Show the treasury; Centre dislikes an overspent wage bill; excess money chases scarce goods (queues, black market) | High |
| 4 | Unclear whether card choices move bars immediately, and what their consequences are | Legibility | They do apply immediately (small, about ±2 to ±6), and some also change the world (e.g. tractors delivered). Animate the bar change on the swipe, and list delayed effects in the quarter's reckoning | High |
| 5 | Cards need +/- bar indicators like Reigns | Feature | Replace the neutral hint dots with up/down markers per bar, sized small or large by magnitude, no exact numbers | High |
| 6 | Unclear what Approve / Reject / Audit actually do | Design gap + legibility | **Principle (agreed): the right call is always rewarded.** The player may still choose "wrong" on purpose when the reward would push a bar over an edge (e.g. catching a liar pushes the Centre too high). Today approving a lie is the best move, which breaks this. Fix: approved padding becomes the player's liability (Centre spot-checks count it as your inflation; the ratchet raises targets on fake numbers); a catch recovers skimmed goods, lowers Shadow, reforms the manager and raises the Centre; rejecting a padded report makes the manager refile closer to the truth; rejecting an honest one is punished. Show +/- hints on each stamp like the cards | High |
| 7 | Pacing: should last longer than Reigns, but losing after 3–4 quarters shouldn't be uncommon | Balance | Balance harness `npm run balance`: scripted archetypes (random, naive, trusting approver, careful auditor, inflater) over hundreds of seeds, reporting quarters survived and causes of death. **Targets (agreed):** random player often dead by Q2–3; naive median ~5; careful median ~11–15 and rarely dead before Q6; no single cause of death above ~40% (every bar matters). Also checks item 6: careful play must clearly outlast approving everything | High |
| 8 | Struggling to reduce Shadow | Balance / design gap | Cause (`shadowDelta` in `src/sim/quarter.ts`): every manager always skims, so Shadow gets a constant upward push; the only levers down are full shops (at most −5 per quarter) and 2 of ~20 cards. Fix: catching a skimmer lowers Shadow and cuts that manager's skim (item 6); add crackdown actions (a plan-phase order on a town or road with People/Apparatus costs); more cards with a Shadow-down side; tune so a player who fills the shops and audits well can pull Shadow down within 2–3 quarters | High |

## Roadmap additions

- **Tutorial:** guided first quarter (plan, first card, first report, reckoning), skippable, then gets out of the way.
- **Bigger screen support:** a proper PC/laptop layout (larger map, desk documents side by side, keyboard shortcuts) rather than a centred phone column.
