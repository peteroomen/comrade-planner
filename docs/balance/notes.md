# Balance notes (milestone 2, package 3)

Numbers are 300 seeds per archetype from `npm run balance`. Full tables: `baseline-m1.md` (milestone 1), `latest.md` (final).

## Path: baseline, package 2, final

| archetype | m1 baseline median | package 2 median | final median | final dead<=Q3 | final dead<Q6 |
| --------- | ------------------ | ---------------- | ------------ | -------------- | ------------- |
| random    | 8                  | 5                | 4            | 46%            | 90%           |
| naive     | 35                 | 14.5             | 6            | 9%             | 40%           |
| trusting  | 17                 | 19               | 8            | 1%             | 9%            |
| careful   | 25                 | 26               | 13           | 0%             | 1%            |
| inflater  | 8                  | 5                | 3            | 75%            | 100%          |

- Milestone 1: naive nearly immortal (median 35), everything died of Apparatus-high or Centre-low.
- Package 2 (desk consequences, treasury, crackdown) made the desk matter (careful 26 vs naive 14.5) but the game was still far too safe, Centre-low killed 80% of naive/random, and careful died 70% of Apparatus-high (always granting petitions pushed Apparatus up, and nothing pushed back).
- Package 3 raised the pressure on every bar, gave each bar its own way to kill, and made the careful driver steer by the public card hints.

## Why the design changed shape

Two findings from the harness drove everything:

1. A player who can read hints can steer. Once careful chooses card sides by the public hints (pick the side that moves bars toward the middle), it survives 40 quarters at almost any card size. The card deck is a two-sided choice, so volatility alone does not kill a careful player. The deck has to get more demanding over time, and the structural pressures have to be ones a good player must actively manage.
2. Bars with a one-directional bias give one-cause deaths. Centre only ever fell (card content averaged -0.5 Centre per option, targets only ratcheted up), Shadow only ever fell for a careful player (honest managers stop skimming, so nothing pushed it up), Apparatus only rose for a rubber-stamper. Fixing the biases so each bar can die in the way its archetype plays is what spread the causes.

## Constants changed (package 2 value -> final)

### Card deck volatility (all bars)

- `CARD_BAR_SCALE` (new) 1 (implicit) -> 3.3: multiplier on every card's bar effects. Content sizes in `cards.ts` stay small integers; the sim scales them. Hint sizes use the scaled value.
- `CARD_RAMP` (new) 0 -> 0.105: card scale grows by this share of `CARD_BAR_SCALE` for every quarter played (quarter 10 is about 1.9x quarter 1). This is the main thing that gives careful a finite lifespan with mixed causes, since steering gets harder as both options get worse.
- `BAR_DRIFT` 0.06 -> 0.03: bars return to the middle half as fast. Modest, and it lets Q1 to Q3 mistakes stick. Bars still feel alive (card swings are now 3 to 15 points).
- `HINT_LARGE` 5 -> 8: large hint threshold, in scaled points.

### People

- `PEOPLE_QUEUE_GAIN` 12 -> 6: with 12, queues at start cost 9 People in quarter 1 for everyone and People-low dominated every archetype.
- `PEOPLE_WAGE_GAIN` 8 -> 16 and `PEOPLE_PRICE_GAIN` (new) 0 -> 10: pay and prices now move People directly, so the hints ("wage up: People up now", "price up: People down now") are true, and random's extreme plans hurt at once. Default wages and prices are unaffected.
- `APPARATUS_REJECT_HONEST` and `PEOPLE_REJECT_HONEST`: see Apparatus.

### Centre

- `CENTRE_TARGET_GROWTH` (new) 0 -> 0.035: targets rise 3.5% a year whatever was reported ("the plan must grow"). An honest player falls slowly behind; the answer is to lie upward (risky) or to keep the Centre happy some other way. Without this careful never dies.
- `CENTRE_CAUGHT_INFLATION` 40 -> 62: being caught inflating hurts more, which is what kills random (inflates 1.0 to 1.5) and inflater fast.
- `CENTRE_OVERSPEND_GAIN` 8 -> 16, `CENTRE_OVERSPEND_CAP` (new) 1.0: the overspend judgement now compares top-ups with the grant at Centre 50, not today's grant, and one quarter's penalty is capped. Before, low Centre shrank the grant, which made overspend worse, which lowered Centre (a spiral). A test pins that a low Centre does not turn an ordinary wage bill into an overspend.
- Card content: Centre penalties on the granting side were softened and refusing sides now sometimes please the Centre (+1 to +2), so cards no longer average -0.5 Centre per option (now about 0).

### Apparatus

- `APPARATUS_APPROVE` 0.15 -> 2.0 (honest report) and `APPARATUS_PADDED_APPROVE` (new) 0.3 (padded report): approving honest reports is a real reward and rubber-stamping everything breeds an untouchable Apparatus (naive and trusting die of Apparatus-high). Approving a lie earns little, as the plan says.
- `APPARATUS_REJECT_HONEST` 4 -> 7: rejecting honest work costs more. Random rejects a quarter of its reports.
- `APPARATUS_AUDIT` 1.5 -> 1.0 and `APPARATUS_CAUGHT` 3.5 -> 3.0: audits stay a cost but a careful player who audits every quarter no longer bleeds Apparatus to zero.
- Card content: apparatus rewards for granting petitions were cut by 1 to 2 (tractors 5 to 2, Stal bonus 3 to 2 to 1, Zarya steel 4 to 1, brother-in-law 6 to 3). Otherwise "always grant" had Apparatus +12 a quarter and died of it.

### Shadow

- `SHADOW_BASE_GAIN` (new) 0 -> 1.2: the plain leakiness of a planned economy. Before, a careful player who reformed every manager had nothing pushing Shadow up and died of Shadow-low (crackdown overshoot).
- `SHADOW_SKIM_GAIN` 25 -> 18 and `SHADOW_UNMET_GAIN` 12 -> 15: shifted weight from skim toward unmet grain (visible, fixable) so naive is not all Shadow-high.
- `SHADOW_TOLERATED_TIP` 1.2 -> 3.0: dismissing a true tip lets the shadow economy breathe more. Hits naive (alternates sides) and random, not careful or trusting (both pin tips).

## Careful driver changes (public information only)

- Card sides: for non-tip cards, choose the side whose public hints cost least, where cost is how much the hinted bar moves push that bar away from 50 (small about 2.5 points, large about 7, "later" and "uncertain" hints discounted, extra fear past 30 points from the middle). Tips are still pinned. Uses `activeCard(state)` hints and `bars(state)` only.
- Audits are rationed: none when Apparatus is below 38, unless the evidence was already proven by an observer (rejection needs no inspector).
- Wages: lifted 10% when People is below 42 and the bill stays within its budget limit.
- Trusting is still "always grant" and naive is unchanged.

## Targets against final results

| target                                                      | result                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| random dead by Q3 >= 40%, median <= 4                       | 46%, median 4                                                        |
| naive median 4 to 6                                         | 6                                                                    |
| careful median 11 to 15, dead<Q6 <= 5%                      | 13, 1%                                                               |
| careful >= trusting + 3, >= naive + 5                       | 13 vs 8, 13 vs 6                                                     |
| no cause above about 40% of losses (random, naive, careful) | random centre-low 45%, naive shadow-high 41%, careful people-low 40% |

Exceptions and caveats:

- Random's Centre-low is 45% and naive's Shadow-high is 41%, at the edge of "about 40%". Both are the intended killers of those strategies (inflating at random; ignoring the black market), and pushing them down moves the shares onto People-low, which sits just below. Trusting (a pure strategy, not covered by the target) splits Apparatus-high 39% and People-high 38%; inflater dies 93% of Centre-low, as expected for a pure inflater.
- Naive's median is at the top of its 4 to 6 band. Lowering it with card volatility also drags trusting down to naive's level (both alternate or grant the same deck), so the ordering test would go flat. Trusting 8 versus naive 6 is kept deliberately.
- Medians are stable across 50-seed slices: random 3.5 to 4, naive 6 to 7, trusting 7.5 to 8, careful 11.5 to 15.
