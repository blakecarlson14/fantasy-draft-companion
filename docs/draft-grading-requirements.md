# Draft grading app requirements

Status: implemented. Requirements were established in the grill-with-docs session; the user authorized implementation with the remaining calibration choices delegated to the implementation.

## Confirmed requirements

- Produce a report for a completed fantasy football draft.
- Evaluate every team's drafted roster on an A–F letter scale with plus/minus ratings, using the thresholds below.
- The overall grade measures roster strength, not how efficiently managers used their picks.
- Ignore trades, waiver claims, and other roster changes after the draft.
- The initial audience is the user alone. Sharing with the league is not an initial requirement.
- Follow Footballguys' report style, including positional analysis and separate starter and depth evaluations. Exact parity with its grades or proprietary formula is not required by the decisions so far.
- Overall roster strength emphasizes championship potential, informed by projected production, depth, upside, and injury risk. Do not claim precise championship odds.
- Grade viability under this league's rules, not distance from the league average. A means a viable contender; B means competitive with manageable weaknesses; C means significant weaknesses; D means major problems; F means severe deficiencies. This supersedes the original C-centered curve. Multiple or all competitive teams may receive A-range grades.
- Prefer information available by draft completion on draft day. In historical mode, later injuries, news, projections, and results must not affect grades or explanations.
- Show nine grades per team: one overall grade and starter/depth grades for each of QB, RB, WR, and TE, with short explanations.
- Present category evaluations as letter grades only. Keep numerical grading scores, component scores, and calculation weights internal; do not show numeric scores alongside the letters. Retain the agreed written explanations.
- Calculate grades from projected production and useful depth. Discuss supported upside and risk in the written analysis, without separate speculative numerical adjustments. The user accepted this limitation.
- Players assigned to FLEX count toward overall starting strength and must not also count as bench depth. Positional starter grades compare only the same required position slots across teams; this corrects the unfair comparison between one TE and a TE plus a FLEX TE.
- Limit the initial version to the 2026 Minnesota Madness draft.
- Add a Draft report page to the existing companion. A separate app can be considered later.
- Show a league comparison table and a detailed report for each team containing the drafted roster, grade explanations, biggest strength, biggest weakness, and key risks.
- Use straightforward analysis. The user delegated presentation choices; praise and roast modes are not part of the initial scope.
- If sufficient draft-day evidence cannot be recovered, evaluate all original drafted rosters using one common snapshot of current information. Clearly label the evaluation date and that this is not a draft-day evaluation. Freeze the inputs so later visits do not change grades. This fallback was explicitly approved.
- If the chosen evaluation snapshot still cannot support a grade, show an explanation instead of inventing a score. Missing evidence must not be treated as poor roster quality.
- Having no backup QB or TE must not automatically result in a poor depth grade. Coverage is compared with the undrafted baseline as described below.

Footballguys is the reference for the style and structure of grading; the app uses its own data and an independently defined calculation. Production and depth form the numerical basis.

## League context

The existing project's saved Minnesota Madness settings describe 12 teams, starting 1 QB, 2 RB, 3 WR, 1 TE, and 2 FLEX, with 6 bench spots. There are no kicker or defense slots. Reception scoring is 0.5 points plus an additional 0.5 for tight ends.

These settings define the initial league scope. Grade calculations must respect the starting slots, FLEX eligibility, and TE reception premium.

## Historical evidence availability

Local inspection found the draft marked complete, with the last pick at approximately 8:19 PM America/Chicago on September 2, 2026. All 180 picks survive in `draft-logs/1384626278170103808-picks.json`, saved seconds later.

The main Sleeper projection and FantasyPros projection, ranking, and news caches were fetched roughly 24 hours after draft completion. Those fetch times do not establish that their contents were available at the cutoff, so they cannot be accepted as draft-day evidence without additional verification.

Draft-day decision records preserve derived player data for 42 unique players, including only 40 of the 180 drafted players. Some individual player news caches survive from draft day, but a complete historical projection dataset was not found. Cache refreshes overwrite files instead of preserving history.

The implementation uses the approved current-information fallback, prominently labeled. The initial local snapshot was captured September 8, 2026. Source retrieval time is not a claim that every underlying projection was updated at that instant.

## Implemented grading method

### Inputs and starting lineup

Reconstruct every roster from the completed picks, including players omitted by the existing draft recommendation filters. Calculate projected points under the league's scoring rules. Use Sleeper full-season statistical projections with the league's offensive scoring settings, including TE reception premium. The saved FantasyPros data is from a different date and is not blended into this snapshot. Retain the source, season horizon, and retrieval timestamp. Missing projections withhold grades league-wide rather than silently penalizing affected teams or changing the comparison population.

Select the highest projected legal starting lineup: 1 QB, 2 RB, 3 WR, 1 TE, and 2 eligible FLEX players. Overall starter strength is that lineup's projected point total. Positional starter grades compare the required 1 QB, 2 RB, 3 WR, or 1 TE only. FLEX production remains in the overall score and FLEX assignments remain visible in each team's explanation and roster. Adding an extra player at FLEX cannot change the grade of an unchanged fixed-position group.

### Useful depth

For each starter in turn, remove that player and find the best legal replacement lineup using the remaining roster and one undrafted baseline player. Average the resulting lineup production for the overall coverage component. These are one-player absence stress scenarios, not estimates of injury probabilities.

Recompute FLEX assignments in each scenario. Do not credit starters as bench players or assume several teams can actually acquire the same replacement player. The undrafted pool is a comparison baseline, not a transaction prediction.

The replacement baseline is the median projection among the three highest projected undrafted players at each position. For a one-player absence scenario, allow one baseline replacement at the absent player's position, and reassign FLEX as needed. Positional depth measures recovered production above the surviving starters' total, averaged across absent starters at that position.

Adequate reserve coverage is defined as restoring 65% of a typical starter's production at that position. Apply the same viability scale below to recovered production divided by this target. This heuristic reflects lower expectations for reserves than starters. A good undrafted baseline can provide adequate cover without a drafted backup; plentiful QB replacement options may produce strong QB depth grades throughout the league. This is coverage quality, not a reward for owning many backups or a prediction that a waiver claim will succeed.

### Overall formula and letters

Build a league-sized benchmark from the entire frozen player pool: the top 12 QBs, 24 RBs, 36 WRs, and 12 TEs, plus the best 24 remaining RB/WR/TE players for FLEX. Divide production by 12 to obtain a representative team. No player fills two benchmark slots. Positional benchmarks use the fixed-position groups only.

Overall viability ratio: `(0.80 × healthy lineup production + 0.20 × mean one-starter-absent lineup production) / benchmark lineup production`. Weight comparable projected points before converting to a grade, rather than combining independently curved scores. Positional starter ratios compare their fixed-slot production with the matching benchmark. Team names, owners, and Footballguys grades are never grading inputs.

Convert ratios into internal scores using linear interpolation between these anchors: 0→0, 0.50→50, 0.65→60, 0.75→70, 0.85→80, 0.95→90, 1.00→93, 1.10→100. A-range therefore represents near-benchmark production, while low grades require substantial shortfalls. These thresholds are explicit judgment calls, not empirically validated playoff probabilities or Footballguys' proprietary formula.

Letter bands: A+ at 97, A at 93, A− at 90, B+ at 87, B at 83, B− at 80, C+ at 77, C at 73, C− at 70, D+ at 67, D at 63, D− at 60, and F below 60. Compare unrounded scores against thresholds. Do not force a fixed number of teams into each band.

Internal design examples only, not report presentation:

| Production relative to benchmark | Grade |
| --- | --- |
| 100% | A |
| 95% | A− |
| 90% | B |
| 80% | C |
| 70% | D |
| 50% | F |

### Upside, risk, and explanations

The current data contains season projections, injury information, news, and disagreements between sources, but not calibrated player ceilings or injury probabilities. Explain supported upside and risk in prose and through the coverage analysis. Do not add arbitrary numerical bonuses for youth or penalties for injuries already reflected in projections. The user accepted that the numerical grade is a production-and-depth proxy for championship potential.

Each report should explain which players and position groups drive its grades, how FLEX was allocated, useful cover or exposure, and evidence-backed upside and risk. Report model uncertainty separately from roster weakness. Do not reuse the live draft recommendation score, draft urgency, ADP bargains, or roster completion bonuses as grading inputs.

### Acceptance checks

- All 180 picks belong to exactly one reconstructed drafted roster; later transactions have no effect.
- The scoring premium and all nine legal starter slots are respected.
- Missing inputs never become zero-value players silently.
- Identical inputs reproduce identical grades; identical rosters receive identical grades.
- A stronger eligible player replacing a weaker one cannot reduce raw projected lineup strength.
- No-backup QB/TE cases and FLEX reassignment are explicitly checked.
- Grades, explanations, and source dates all refer to the same frozen evaluation snapshot.
- The report displays letter grades without exposing internal numerical grading scores or weights.
- A league of viable rosters may all receive good grades; known severely weak rosters receive F instead of an artificial C or a missing-data message.
- Renaming a team does not change its grades.

## Reference

[Footballguys Rate My Team](https://www.footballguys.com/rate-my-team) is the inspiration. Its [announcement](https://forums.footballguys.com/threads/new-rate-my-team-preview-let-us-know-what-you-think.817078/) describes separate positional, starter, and depth grades. An exact eight-grade layout has not been verified. Reproducing its proprietary scoring formula is not an agreed requirement.
