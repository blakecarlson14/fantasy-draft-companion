# Draft grading app requirements

Revised September 8, 2026 after an independent benchmark and twelve-team audit. This replaces the percentage-of-best model. Earlier methods remain documented in the research history, not active requirements.

## Scope

- Evaluate the 180 original draft picks of 2026 Minnesota Madness, twelve teams with fifteen players each. Ignore subsequent transactions.
- Start one QB, two RB, three WR, one TE and two RB/WR/TE FLEX players, with six reserves. Apply the league's exact scoring, including half PPR plus another half point per TE reception.
- A simple league overview shows overall grades. Each selected team report shows overall starter/depth summaries, positional starter/depth grades, explanations, risk flags and its roster. The user accepted the [verified Footballguys presentation](../research/footballguys-report-layout.md). Its exact formula is not available.
- Only letter grades appear in the UI. The overall grade measures projected roster strength, not pick value or championship probability.
- Use the existing frozen Sleeper statistical projections. Complete draft-day evidence was unavailable: decision logs preserve only 40 of 180 drafted players. The user approved a later common evaluation snapshot. Display its September 8 retrieval time and explicitly say it is not a draft-day evaluation.
- Never refresh the snapshot to change grades. Do not blend differently dated source caches. Withhold all grades if any drafted projection is missing. Known empty roles or zero projections are genuine weaknesses, not missing evidence.

## Independent meaning of starter quality

[Football evidence and preselected examples](../research/independent-roster-benchmarks.md) distinguish elite production from ordinary starter roles. The source supports positional opportunity cost and role comparisons, not our numerical cutoffs.

For each twelve-player role band, use custom-scored player ranks one, three, seven and twelve as best, strong, ordinary and fringe references. RB2 uses offsets of twelve; WR2 and WR3 use offsets of twelve and twenty-four. Thus ordinary groups are QB7, RB7/RB19, WR7/WR19/WR31 and TE7.

Map reference production to internal scores of 100, 95, 85 and 75 respectively, with zero production at zero. Interpolate by projected points, not by rank. Below fringe, interpolate toward zero. Above the best reference, cap at 100. Merge equal-production anchors by averaging their scores so ties cannot introduce a jump.

These score choices explicitly define our letters: strong roles are A-range, ordinary are B, fringe are C, and substantially weaker or absent production is D/F. They are conventions, not Footballguys cutoffs or learned playoff probabilities. Narrow projected tiers can make letters sensitive to small point differences; they are not confidence intervals.

For a positional starter grade, score each required role separately and average. Missing roles score zero, so an exceptional first RB cannot erase an empty second RB slot. Positional starters exclude FLEX.

## FLEX and reserves

Assign the highest projected legal lineup, fixed positions first and then the best two remaining eligible players at FLEX. No player is both a starter and reserve.

For reference construction, remove the full pool's top 12 QBs, 24 RBs, 36 WRs and 12 TEs. The best 24 remaining RB/WR/TE players form the FLEX pool, with two twelve-player reference bands. Remaining positional players form reserve pools, with one reference band for QB/TE and two for RB/WR. These six reserve roles are a benchmark, not a mandatory draft strategy.

Positional depth scores the best owned QB/TE reserve, or the best two owned RB/WR reserves with twice the weight on the first. It uses the same strong/ordinary/fringe interpolation, now within reserve bands. An empty position scores F for owned depth, not for drafting judgment. No waiver player is credited.

Overall reserve inventory counts the projected production of all owned RB/WR/TE reserves, plus only the best backup QB. Skill-position reserves can cover FLEX, while a third QB provides no additional one-QB coverage in this simple model. This measures projected reserve inventory, not injury probabilities, exact absence-lineup coverage or conditional handcuff upside. A deep WR bench cannot directly fill a required RB slot; the positional depth grades retain that warning.

## Overall calculation

Let S be total projected production of the best legal starters, and B the reserve inventory above. Overall production value is `0.9*S + 0.1*B`. This discounts each reserve point against a starter point; it does not mean the bench contributes exactly ten percent of the final score.

Build four reference totals by summing the corresponding best/strong/ordinary/fringe reference roles. The starting total includes nine roles and the reserve total includes six. Apply the same weighted production calculation to those references, then interpolate once to obtain overall quality. Aggregate starter and depth grades separately compare S and B with their reference totals. Never average the displayed letter grades.

This replaces the weighted average of capped positional grades that could penalize a bench-to-FLEX promotion. Algebraically the new value is `0.8*S + 0.1*(S+B)`. With fixed references and roster eligibility, both terms are nondecreasing under a player upgrade. Do not confuse that property with a guarantee that changing the entire projection pool leaves all relative benchmarks unchanged.

Letter thresholds remain A+ 97, A 93, A- 90, B+ 87, B 83, B- 80, C+ 77, C 73, C- 70, D+ 67, D 63, D- 60, F below 60, compared without rounding. Team identity, external grades and desired league distributions are never inputs.

## Verification and limits

`npm test` covers scoring, missing inputs, legal lineups, frozen data, tier ties, ordinary QB/TE anchors, player-upgrade behavior, excess QBs, rendering and navigation fixtures. `npm run check:grading` exercises independent role examples, 200 ADP-driven mock leagues, depleted rosters and 720 upgrades across all real drafted players.

See the [twelve-team audit](../research/roster-grading-audit.md) for findings and actual grade changes. Checks establish consistency with the chosen meanings, not historical predictive accuracy. Season projections cannot quantify ceiling, weekly consistency, conditional handcuff outcomes or recovery probabilities. Discuss those limitations rather than inventing bonuses or penalties. Risk flags come from the same snapshot; later research does not silently change frozen player evaluations.
