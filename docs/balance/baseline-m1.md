# Balance harness results

300 seeds per archetype (seeds 1..300), runs censored at 40 quarters. Quarters are the quarter of death; survivors count as 40.
Regenerate with `npm run balance`.

| archetype | median | p10 | p90 | dead<=Q3 | dead<Q6 | survived |
| --- | --- | --- | --- | --- | --- | --- |
| random | 8 | 6 | 12 | 1% | 8% | 0% |
| naive | 35 | 16.9 | 40 | 0% | 3% | 34% |
| trusting | 17 | 14 | 21 | 0% | 0% | 0% |
| careful | 25 | 23 | 30 | 0% | 0% | 0% |
| inflater | 8 | 7 | 9 | 0% | 3% | 0% |

### random

- Death quarter histogram (deaths): Q3:2 Q4:4 Q5:18 Q6:30 Q7:57 Q8:49 Q9:54 Q10:34 Q11:19 Q12:17 Q13:5 Q14:6 Q15:3 Q17:1 Q18:1
- Share of deaths by cause: apparatus-low 45%, centre-low 34%, people-low 21%

### naive

- Death quarter histogram (deaths): Q5:9 Q6:9 Q7:4 Q12:1 Q14:2 Q15:4 Q16:1 Q17:1 Q18:4 Q19:3 Q20:3 Q21:1 Q22:2 Q23:6 Q24:4 Q25:7 Q26:7 Q27:14 Q28:8 Q29:6 Q30:10 Q31:10 Q32:7 Q33:10 Q34:11 Q35:9 Q36:12 Q37:6 Q38:9 Q39:11 40+:103
- Share of deaths by cause: apparatus-high 75%, shadow-high 13%, people-low 13%

### trusting

- Death quarter histogram (deaths): Q8:1 Q11:1 Q12:4 Q13:10 Q14:24 Q15:28 Q16:38 Q17:45 Q18:48 Q19:34 Q20:24 Q21:24 Q22:6 Q23:4 Q24:7 Q25:1 Q39:1
- Share of deaths by cause: apparatus-high 100%, people-low 0%

### careful

- Death quarter histogram (deaths): Q10:1 Q19:1 Q20:2 Q21:10 Q22:15 Q23:37 Q24:46 Q25:51 Q26:42 Q27:25 Q28:23 Q29:16 Q30:11 Q31:7 Q32:4 Q33:4 Q34:3 Q35:1 Q36:1
- Share of deaths by cause: apparatus-high 100%, people-low 0%

### inflater

- Death quarter histogram (deaths): Q5:9 Q6:13 Q7:56 Q8:109 Q9:97 Q10:14 Q11:2
- Share of deaths by cause: centre-low 95%, people-low 5%
