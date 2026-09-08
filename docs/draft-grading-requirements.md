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
- Compare teams within their own league. A middle-of-the-pack roster should receive roughly a C; similarly strong teams can receive similar grades.
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

Evaluate the bench by how well it can cover unavailable starters. For each starter in turn, remove that player and find the best legal replacement lineup. Compare what the bench provides against a common baseline from players left undrafted. These are one-player absence scenarios, not estimates of injury probabilities; average their benefit to obtain a team depth measure.

Recompute FLEX assignments in each scenario. Do not credit starters as bench players or assume several teams can actually acquire the same replacement player. The undrafted pool is a comparison baseline, not a transaction prediction.

The replacement baseline is the median projection among the three highest projected undrafted players at each position. For a one-player absence scenario, allow one baseline replacement at the absent player's position, and reassign FLEX as needed. Positional depth uses average coverage benefit for starters at that position.

QB/TE depth describes the advantage of carrying useful cover over relying on the undrafted pool. When the baseline reaches 65% of the league's average leading starter projection at that position, the displayed depth grade has a neutral C floor. This threshold is a simple coverage heuristic, not an injury or waiver probability. The overall grade still measures actual drafted bench benefit across all starter absence scenarios; the neutral positional floor does not award hypothetical bench production.

### Overall formula and letters

Overall score: `0.80 × starter score + 0.20 × depth score`.

For each team component, normalize its raw measure as `75 + 10 × (value - league mean) / league standard deviation`, capped at 0–100. If every team has the same raw value, assign 75. Starter and depth measures are normalized separately. Positional grades use the same normalization within each position, with the QB/TE coverage floor described above. Weights and calibration are design choices, not Footballguys' known formula or validated championship probabilities.

Letter bands: A+ at 97, A at 93, A− at 90, B+ at 87, B at 83, B− at 80, C+ at 77, C at 73, C− at 70, D+ at 67, D at 63, D− at 60, and F below 60. Compare unrounded scores against thresholds. Do not force a fixed number of teams into each band.

Internal design examples only, not report presentation:

| Starter score | Depth score | Overall | Grade |
| --- | --- | --- | --- |
| 95 | 85 | 93 | A |
| 92 | 50 | 83.6 | B |
| 75 | 75 | 75 | C |
| 60 | 65 | 61 | D− |

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

## Reference

[Footballguys Rate My Team](https://www.footballguys.com/rate-my-team) is the inspiration. Its [announcement](https://forums.footballguys.com/threads/new-rate-my-team-preview-let-us-know-what-you-think.817078/) describes separate positional, starter, and depth grades. An exact eight-grade layout has not been verified. Reproducing its proprietary scoring formula is not an agreed requirement.
