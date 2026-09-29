# Balance harness results

300 seeds per archetype (seeds 1..300), runs censored at 40 quarters. Quarters are the quarter of death; survivors count as 40.
Regenerate with `npm run balance`.
Card share: card effects as a share of all bar movement (sum of |card change| over card plus non-card |change|, per bar per quarter; non-card is net change minus card effect, so cards that cancel the sim still count). Card deaths: share of deaths that happened on a card in mid-quarter.

| archetype | median | p10 | p90 | dead<=Q3 | dead<Q6 | survived | card share | card deaths |
| --------- | ------ | --- | --- | -------- | ------- | -------- | ---------- | ----------- |
| random    | 3      | 2   | 5   | 60%      | 99%     | 0%       | 23%        | 6%          |
| naive     | 6      | 5   | 7   | 0%       | 48%     | 0%       | 29%        | 8%          |
| trusting  | 7      | 6   | 12  | 0%       | 8%      | 0%       | 38%        | 1%          |
| careful   | 14     | 9   | 18  | 0%       | 2%      | 0%       | 38%        | 1%          |
| inflater  | 3      | 3   | 4   | 63%      | 100%    | 0%       | 23%        | 1%          |

### random

- Death quarter histogram (deaths): Q2:46 Q3:135 Q4:88 Q5:28 Q6:3
- Share of deaths by cause: people-low 53%, centre-low 43%, apparatus-low 4%

### naive

- Death quarter histogram (deaths): Q3:1 Q4:28 Q5:116 Q6:98 Q7:36 Q8:14 Q9:5 Q10:1 Q11:1
- Share of deaths by cause: apparatus-high 34%, people-low 33%, shadow-high 33%, centre-low 0%

### trusting

- Death quarter histogram (deaths): Q4:2 Q5:23 Q6:65 Q7:72 Q8:41 Q9:36 Q10:21 Q11:9 Q12:18 Q13:8 Q14:3 Q15:1 Q17:1
- Share of deaths by cause: apparatus-high 66%, shadow-high 18%, people-low 11%, centre-low 6%

### careful

- Death quarter histogram (deaths): Q4:2 Q5:3 Q6:5 Q7:5 Q8:8 Q9:10 Q10:19 Q11:28 Q12:28 Q13:31 Q14:32 Q15:32 Q16:18 Q17:33 Q18:18 Q19:19 Q20:9
- Share of deaths by cause: centre-low 49%, people-low 26%, shadow-high 24%, apparatus-low 1%

### inflater

- Death quarter histogram (deaths): Q3:190 Q4:110
- Share of deaths by cause: centre-low 100%
