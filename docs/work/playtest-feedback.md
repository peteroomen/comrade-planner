# Playtest feedback (milestone 1)

Triage only. Fixes land with the next slice.

| # | Feedback | Type | Proposed fix | Priority |
| --- | --- | --- | --- | --- |
| 1 | Can't tell roads from rails; only watching the rails | Visual clarity | Rails stay black-and-white dashed; roads become thin brown double lines; night trucks only on roads | High |
| 2 | Hard to know what consequences a choice will have; some confusion is good, some just confusing | Legibility | Direction-only effect hints on plan controls (like card bar dots); short first-quarter guide | High |
| 4 | Unclear whether card choices move bars immediately, and what their consequences are | Legibility | They do apply immediately (small, about ±2 to ±6), and some also change the world (e.g. tractors delivered). Animate the bar change on the swipe, and list delayed effects in the quarter's reckoning | High |
| 5 | Cards need +/- bar indicators like Reigns | Feature | Replace the neutral hint dots with up/down markers per bar, sized small or large by magnitude, no exact numbers | High |
| 6 | Unclear what Approve / Reject / Audit actually do | Design gap + legibility | Today approving a lie is the best move: Apparatus up, full figure goes upward, Centre happy, no risk. Reject only costs Apparatus and cuts the upward figure 15%; audit only costs Apparatus and reveals the truth next quarter. Fix: approved padding becomes the player's liability (Centre spot-checks count it as your inflation, and the ratchet raises targets on fake numbers); a catch recovers skimmed goods, lowers Shadow, reforms the manager, and pleases the Centre; reject makes the manager refile closer to the truth. Show +/- hints on each stamp like the cards | High |
| 7 | Pacing: should last longer than Reigns, but losing after 3–4 quarters shouldn't be uncommon | Balance | Build a balance harness: scripted player archetypes (naive, random, trusting approver, careful auditor, inflater) played headless over hundreds of seeds, reporting quarters survived and causes of death. Proposed targets: random player often dead by Q3–4; naive player median ~6–8; careful player median ~15–20 and rarely dead before Q8; no single cause of death above ~40%. Run it in CI or as `npm run balance`, and tune `balance.ts` against it | High |
| 3 | What do wages do? Any downside to raising them? | Design gap | Today: People and productivity up, only hidden cost is the treasury. Show the treasury; Centre dislikes an overspent wage bill; excess money chases scarce goods (queues, black market) | High |
