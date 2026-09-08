# Draft grading app requirements

Implemented September 8, 2026. The user withdrew the contender-based A/F definitions and authorized this research-informed revision. It supersedes the C-centered curve and the later viability formula.

## Scope and evidence

- Personal report for the completed 2026 Minnesota Madness draft. Reconstruct all 180 picks, never current rosters or subsequent transactions.
- Twelve teams, fifteen players each. Start one QB, two RBs, three WRs, one TE, and two FLEX players, with six reserves. Half PPR plus an additional half point per TE reception.
- League overview shows only each team's overall grade. Individual reports add total starter and depth grades, followed by starters/depth for QB, RB, WR, TE. This follows a verified public Footballguys report, documented in [layout research](../research/footballguys-report-layout.md). Include rosters, explanations, strengths, weaknesses, and injury flags. No numerical scores in the report UI.

The layout has a verified Footballguys reference; the calculation below is independent, not a verified copy of its formula. The UI must disclose that letter calibration is provisional and not yet validated.
- Overall describes projected roster strength, not pick value or championship probability. A strong selection at its price need not be an elite starter.
- Use full-season Sleeper statistical projections scored under the league's rules throughout the report. Do not blend the differently dated FantasyPros cache or live draft recommendation score.
- Prefer draft-day evidence. Only 40 of 180 drafted players have preserved draft-day decision values, so the user approved a common current-information fallback. The local snapshot was captured September 8, 2026. Retrieval time does not establish when each underlying projection changed.
- Keep the snapshot frozen. Methodology revisions must not refetch it. Label this as a later evaluation of original drafted rosters, not a draft-day evaluation.
- Withhold grades league-wide if any drafted projection is missing. Known zero production or an empty position is a weakness, not missing evidence.

## Positional reference roles

Sort the full frozen player pool by league-scored projected points. Compare each roster's best fixed-position starters with these reference ranks:

| Position | Reference ranks |
| --- | --- |
| QB | QB1 |
| RB | RB1, RB13 |
| WR | WR1, WR13, WR25 |
| TE | TE1 |

Each role contributes its player's production divided by its reference production, capped between zero and one. Average those ratios for the position grade. Capping prevents an exceptional first player from erasing a missing second player. These are strong reference roles, not an average-team baseline or a roster every team could draft simultaneously.

Reserve the pool's top 12 QBs, 24 RBs, 36 WRs, and 12 TEs for fixed starting roles. From remaining RB/WR/TE players, reserve the top 24 for FLEX. Their first and thirteenth players are the two FLEX references. Assign each team's highest projected legal lineup to fixed positions first, then the best two remaining FLEX-eligible players. No player counts twice. FLEX affects overall, never fixed-position grades or bench grades.

Footballguys documents the fixed-position reference-rank idea in its By Pos percentage ratings. Our FLEX allocation, reserve allocation, weights, and letters are independent choices. Its current Rate My Team formula is not publicly established by this research. See [research findings](../research/draft-grading-methodology.md).

## Owned depth

After removing the pool's fixed starters and FLEX allocation, use the remaining positional pool for reserve references. Compare the best owned QB and TE reserves with the first remaining player at their position. Compare the best two owned RB and WR reserves with the first and thirteenth remaining players, weighting the first reserve twice as much as the second. Cap each ratio at one.

This represents six reserve roles: one QB, two RB, two WR, one TE. It is a reference allocation, not advice that every team must draft those positions. Additional reserves receive no quantity bonus. FLEX starters are never reserves.

No reserve means F for owned depth at that position. It does not mean skipping a backup was a drafting mistake. Available players do not count as owned production. This replaces the old requirement that waiver coverage could earn good depth grades without a backup.

## Overall and letters

Average the nine starter-role ratios equally, including both FLEX roles. Average positional depth scores with weights of one QB, two RB, three WR, and one TE, reflecting mandatory starting demand. Overall is 90% starting strength plus 10% owned depth. Convert once, after aggregation. These weights are design judgments, not empirically estimated or attributed to Footballguys.

An entirely empty bench costs ten internal points at most, rather than the previous formula's roughly two-percent effective limit. Missing only QB or TE depth costs at most 1.43 overall points. Missing a required starter costs up to ten overall points.

Multiply the ratio by 100 and apply unrounded thresholds: A+ at 97, A at 93, A- at 90, B+ at 87, B at 83, B- at 80, C+ at 77, C at 73, C- at 70, D+ at 67, D at 63, D- at 60, F below 60. No further viability transformation or within-league curve. Team identity and external grades are never inputs.

Letters summarize projected production against strong matching roles. A is excellent, B strong, C moderate, D weak, F very low or absent. They are not percentiles or playoff odds. Teams may share grades.

## Checks and limitations

Run `npm test` for the checks in `test/draft-report.test.mjs`.

- Role ratios of 100%, 95%, 90%, 85%, 75%, 65%, and 50% produce A+, A, A-, B, C, D, and F.
- Identical synthetic teams get identical grades. Reference-matching starters with strong RB/WR reserves and no QB/TE reserves earn A+. Removing the remaining bench lowers that to A- without changing starter grades.
- Reducing one synthetic roster's production to three quarters yields a C-range overall; a nearly zero-production roster yields F. Every real team uses this same conversion.
- An exceptional player cannot hide an empty second role. Stronger undrafted options cannot turn an empty owned bench into good depth.
- Unchanged fixed-position groups retain grades when a reserve enters FLEX below their reference ranks. Names cannot change grades. Missing projections withhold grades. Reopening a saved snapshot cannot fetch new inputs.
- Browser checks cover letter-only rendering, escaped team names, error/retry states, and mobile overflow.

These checks establish formula behavior, not historical predictive accuracy. No independent multi-season outcome validation or broad realistic mock-draft calibration has been completed. Season totals do not establish weekly consistency, ceiling, or injury probabilities. Avoid invented upside bonuses and double-counted injury penalties. Low projections are not proof that a prospect has no upside.
