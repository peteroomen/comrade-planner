# Balance notes (milestone 2, package 3)

Numbers are 300 seeds per archetype from `npm run balance`. Full tables: `baseline-m1.md` (milestone 1), `latest.md` (final).

## Path: baseline, package 2, final

| archetype | m1 median | package 2 median | final median | dead<=Q3 | dead<Q6 | card share | mid-quarter card deaths |
| --------- | --------- | ---------------- | ------------ | -------- | ------- | ---------- | ----------------------- |
| random    | 8         | 5                | 3            | 60%      | 99%     | 23%        | 6%                      |
| naive     | 35        | 14.5             | 6            | 0%       | 48%     | 29%        | 8%                      |
| trusting  | 17        | 19               | 7            | 0%       | 8%      | 38%        | 1%                      |
| careful   | 25        | 26               | 14           | 0%       | 2%      | 38%        | 1%                      |
| inflater  | 8         | 5                | 3            | 63%      | 100%    | 23%        | 1%                      |

Causes of death (final): random people-low 53, centre-low 43, apparatus-low 4. Naive apparatus-high 34, people-low 33, shadow-high 33. Careful centre-low 49, people-low 26, shadow-high 24. Trusting apparatus-high 66, shadow-high 18, people-low 11, centre-low 6. Inflater centre-low 100.

## Rework: pressure comes from the province, not the deck

The first tuning pass (commit 7aa6154) hit the numbers with a card deck scaled 3.3x plus a ramp. Cards then made up nearly all bar movement and about 70% of deaths were a card in mid-quarter. This pass reverses that. The card deck is back to `CARD_BAR_SCALE` 1.3 (no ramp, `CARD_RAMP` removed, largest single card effect 7.8 points, a test pins the 12 point ceiling). All the pressure now comes from the quarter-end reckoning.

Two measures are printed per archetype by `npm run balance`:

- Card share: sum of |card effect| over (card |effect| + non-card |change|), per bar per quarter. Non-card is the net change minus the card effect, so a card that only cancels the sim still counts as card movement. Limit about 40%: naive 29%, careful 38%.
- Card deaths: share of deaths that happened on a card in the middle of a quarter (not at the reckoning or when a plan is committed). Limit about 35%: naive 8%, careful 1%.

## Sim pressure added or retuned (package 2 value to final)

### Escalation with time (new, all per quarter, scaled by years elapsed)

- `PEOPLE_YEAR_DRAG` 0 to 1.3: People lose ground as expectations rise.
- `APPARATUS_YEAR_DRAG` 0 to 3.8: the machine wears; the Apparatus needs feeding.
- `SHADOW_YEAR_GAIN` 0 to 1.8: the black market matures.
- `CENTRE_TARGET_GROWTH` 0 to 0.046: Centre targets rise every year whatever was reported. An honest player falls slowly behind.
- `GREED_CREEP` 0 to 0.03: every manager gets greedier each quarter (more skimming, more padding) until an audit catches them and cuts greed back.
- `BAR_DRIFT` 0.06 to 0.03: bars return to the middle half as fast.

### People

- `PEOPLE_QUEUE_GAIN` 12 to 11, `PEOPLE_CONSUMER_TARGET` 0.25 to 0.28.
- `PEOPLE_WAGE_GAIN` 8 to 10 and `PEOPLE_PRICE_GAIN` new, 15: pay and prices move People directly (dearer shops hurt at once, cheaper please). This makes the plan hints true and punishes random's extreme prices. It is symmetric, so careful can use it: it lifts wages 10% or cuts the consumer price 10% when People is low.
- `PEOPLE_REJECT_HONEST` 2 to 4.

### Apparatus

- `APPARATUS_APPROVE` 0.15 to 2.6 (honest) and `APPARATUS_PADDED_APPROVE` new, 2.1. The gap is 0.5 a report, so the bar leaks little about padding (the earlier pass used a gap of 0.7 to 0.8 at smaller values). Approving is a real reward, and rubber-stamping breeds an untouchable Apparatus (naive and trusting die of Apparatus-high).
- `APPARATUS_REJECT_HONEST` 4 to 16, `APPARATUS_AUDIT` 1.5 to 2.0: rejecting honest work costs a lot, audits cost goodwill. The reject stamp hint is therefore "Apparatus down, large, uncertain" for every report, so it does not reveal padding.

### Centre

- `CENTRE_CAUGHT_INFLATION` 40 to 60: being caught inflating hurts more (kills random and inflater).
- `CENTRE_OVERSPEND_GAIN` 8 to 40, `CENTRE_OVERSPEND_CAP` new, 1.0: the overspend penalty compares top-ups with the grant at Centre 50 and is capped per quarter, so a low Centre cannot spiral it (a test pins this). The gain is high because only reckless wage plans reach the free limit.

### Shadow

- `SHADOW_BASE_GAIN` new, 2.8: the plain leakiness of a planned economy. Without it, a careful player who reforms every manager had nothing pushing Shadow up.
- `SHADOW_SKIM_GAIN` 25 to 12, `SHADOW_UNMET_GAIN` 12 to 15, `SHADOW_TOLERATED_TIP` 1.2 to 3.0.

### Cards (content and hints)

- Content edits from the first pass stay: refusing sides sometimes please the Centre, granting sides give less Apparatus (average Centre per option about 0).
- `HINT_LARGE` 5 (unchanged from the hints commit). With scale 1.3, a raw effect of 4 or more shows as large.

## Careful driver (public information only)

- Non-tip card sides: chosen by the public hints plus the current bars (the side that pushes bars least far from the middle wins; later and uncertain hints discounted; extra fear near the edges). Tips are still pinned.
- Audits rationed below Apparatus 38; used freely (every free inspector) above 62, since the goodwill cost is then welcome.
- When People is below 46: wages lift 10% within the wage-bill budget, steel share leans to Zarya (0.4), consumer price cut 10%.
- Trusting is still "always grant", naive is unchanged.

## Targets against final results

| target                                            | result                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| random dead by Q3 >= 40%, median <= 4             | 60%, median 3                                                      |
| naive median about 5 (4 to 6)                     | 6                                                                  |
| careful median 11 to 15, dead<Q6 <= 5%            | 14, 2%                                                             |
| careful >= trusting + 3, >= naive + 5             | 14 vs 7, 14 vs 6                                                   |
| no cause above about 40% (random, naive, careful) | naive 34/33/33 (good); careful centre-low 49; random people-low 53 |
| card share <= 40% (careful, naive)                | 38%, 29%                                                           |
| card deaths < 35% (careful, naive)                | 1%, 8%                                                             |
| no card side above 12 points                      | max 7.8, tested                                                    |

Caveats:

- Careful's centre-low (49%) and random's people-low (53%) are above 40%. Random dies almost entirely of two things (its inflation is caught at the Centre, and its random prices and wages sink People), and it dies within four quarters, so there is little room for a third cause. Careful's Centre has no active counter in the harness (it never inflates), so the target growth is what eventually ends it. Making careful inflate would fix the share but would need a smarter driver than "public information only, honest report".
- Naive's median is at 6 (p10 5). Pushing it to 5 with pure sim pressure makes Apparatus-high take over (see 3.0 approve gain in the tuning log: 95% Apparatus-high).
- Trusting is a pure strategy and dies 66% of Apparatus-high, as expected.
- 50-seed slices: random 3 to 3.5, naive 5 to 6, trusting 7 to 8, careful 13 to 14.5.
