# Balance harness results

300 seeds per archetype (seeds 1..300), runs censored at 40 quarters. Quarters are the quarter of death; survivors count as 40.
Regenerate with `npm run balance`.

| archetype | median | p10 | p90 | dead<=Q3 | dead<Q6 | survived |
| --- | --- | --- | --- | --- | --- | --- |
| random | 5 | 4 | 7 | 4% | 53% | 0% |
| naive | 14.5 | 6 | 31 | 0% | 6% | 3% |
| trusting | 19 | 10.9 | 24 | 0% | 1% | 0% |
| careful | 26 | 17.9 | 31 | 0% | 1% | 0% |
| inflater | 5 | 4 | 5 | 0% | 92% | 0% |

### random

- Death quarter histogram (deaths): Q3:11 Q4:59 Q5:90 Q6:82 Q7:29 Q8:20 Q9:6 Q10:2 Q11:1
- Share of deaths by cause: centre-low 82%, people-low 14%, apparatus-low 5%

### naive

- Death quarter histogram (deaths): Q4:1 Q5:16 Q6:16 Q7:5 Q8:10 Q9:12 Q10:18 Q11:17 Q12:25 Q13:15 Q14:15 Q15:15 Q16:9 Q17:13 Q18:16 Q19:6 Q20:6 Q21:10 Q22:6 Q23:5 Q24:7 Q25:5 Q26:3 Q27:5 Q28:3 Q29:7 Q30:2 Q31:8 Q32:5 Q33:1 Q34:2 Q35:5 Q36:1 Q37:1 40+:9
- Share of deaths by cause: centre-low 81%, people-low 14%, shadow-high 4%, apparatus-high 0%

### trusting

- Death quarter histogram (deaths): Q4:1 Q5:1 Q6:2 Q7:1 Q8:6 Q9:7 Q10:12 Q11:14 Q12:18 Q13:20 Q14:7 Q15:9 Q16:10 Q17:10 Q18:11 Q19:22 Q20:20 Q21:27 Q22:24 Q23:30 Q24:19 Q25:18 Q26:4 Q28:3 Q29:1 Q30:1 Q31:1 Q34:1
- Share of deaths by cause: centre-low 50%, apparatus-high 48%, people-low 2%

### careful

- Death quarter histogram (deaths): Q4:2 Q5:1 Q8:1 Q9:4 Q11:1 Q12:4 Q13:6 Q14:4 Q15:3 Q16:1 Q17:3 Q18:4 Q19:2 Q20:4 Q21:6 Q22:16 Q23:19 Q24:28 Q25:36 Q26:33 Q27:32 Q28:25 Q29:16 Q30:18 Q31:6 Q32:6 Q33:3 Q34:6 Q35:4 Q36:1 Q37:1 Q38:1 Q39:1 40+:1
- Share of deaths by cause: apparatus-high 70%, centre-low 10%, shadow-low 10%, people-low 8%, apparatus-low 1%

### inflater

- Death quarter histogram (deaths): Q4:70 Q5:206 Q6:24
- Share of deaths by cause: centre-low 100%
