# Balance harness results

300 seeds per archetype (seeds 1..300), runs censored at 40 quarters. Quarters are the quarter of death; survivors count as 40.
Regenerate with `npm run balance`.

| archetype | median | p10 | p90 | dead<=Q3 | dead<Q6 | survived |
| --------- | ------ | --- | --- | -------- | ------- | -------- |
| random    | 4      | 2   | 5.1 | 46%      | 90%     | 0%       |
| naive     | 6      | 4   | 10  | 9%       | 40%     | 0%       |
| trusting  | 8      | 6   | 10  | 1%       | 9%      | 0%       |
| careful   | 13     | 7.9 | 20  | 0%       | 1%      | 0%       |
| inflater  | 3      | 3   | 4   | 75%      | 100%    | 0%       |

### random

- Death quarter histogram (deaths): Q1:1 Q2:46 Q3:90 Q4:86 Q5:47 Q6:19 Q7:8 Q8:3
- Share of deaths by cause: centre-low 45%, people-low 34%, apparatus-low 16%, shadow-high 5%, people-high 0%

### naive

- Death quarter histogram (deaths): Q2:1 Q3:27 Q4:52 Q5:39 Q6:55 Q7:38 Q8:23 Q9:21 Q10:16 Q11:9 Q12:7 Q13:5 Q14:4 Q15:2 Q19:1
- Share of deaths by cause: shadow-high 41%, people-low 35%, apparatus-low 11%, centre-low 6%, apparatus-high 5%, centre-high 2%, people-high 1%

### trusting

- Death quarter histogram (deaths): Q3:2 Q4:6 Q5:20 Q6:32 Q7:69 Q8:54 Q9:56 Q10:34 Q11:12 Q12:8 Q13:3 Q14:2 Q17:1 Q18:1
- Share of deaths by cause: apparatus-high 39%, people-high 38%, centre-low 14%, shadow-high 5%, apparatus-low 3%, people-low 1%

### careful

- Death quarter histogram (deaths): Q4:2 Q5:1 Q6:8 Q7:19 Q8:20 Q9:19 Q10:26 Q11:22 Q12:20 Q13:19 Q14:19 Q15:17 Q16:15 Q17:21 Q18:21 Q19:14 Q20:16 Q21:4 Q22:7 Q23:2 Q24:4 Q25:2 Q26:1 Q27:1
- Share of deaths by cause: people-low 40%, apparatus-low 30%, centre-low 16%, shadow-low 6%, shadow-high 5%, apparatus-high 1%, people-high 1%, centre-high 1%

### inflater

- Death quarter histogram (deaths): Q2:28 Q3:196 Q4:68 Q5:8
- Share of deaths by cause: centre-low 93%, people-low 5%, shadow-high 3%
