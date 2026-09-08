# Independent roster benchmarks

Researched September 8, 2026, without inspecting the app's current grades or fitting examples to its league. Scope is 12 teams, one QB, two RB, three WR, one TE, two RB/WR/TE FLEX, six reserves, half PPR with an additional half point per TE reception.

## What the sources establish

Footballguys' value-based drafting principle compares a player's scoring advantage with peers at the same position. Raw point totals alone cannot compare positional value. The league's scoring, starter counts and player availability determine the relevant comparison. Its original methodology distinguishes a worst starter, an average starter, and a draft-availability baseline. Those are different questions, not interchangeable denominators. [Joe Bryant, Principles of Value-Based Drafting, 2021](https://www.footballguys.com/article/2021-value-based-drafting), [2016 baseline explanation](https://www.footballguys.com/article/bryant_vbd?article=bryant_vbd).

Footballguys' July 2026 Draft Dominator guide explicitly permits separate starter and waiver benchmarks. Its default strategy prioritizes starters and then upside reserves. That supports separating current projected reserve usefulness from speculative upside, but does not supply a numerical reserve weight or grade formula. [Draft Dominator V3 settings](https://sportsguys.zendesk.com/hc/en-us/articles/52127817112475-Draft-Dominator-V3-Configuring-Your-Rankings-Strategy-Settings).

The 2024 By Pos guide describes comparing RB1 with the top RB and RB2 with RB13 in a 12-team league. It also describes expected reserve allocation, a QB13 reserve reference, and greater starter weight. Its FLEX allocation algorithm is unpublished. This is evidence for role comparisons, not proof of today's Rate My Team letter cutoffs. [By Pos ratings](https://sportsguys.zendesk.com/hc/en-us/articles/360007826713-Understanding-Roster-By-Pos-Ratings).

Footballguys' May 2026 quarterback tiers separate elite QB1s from players who could join that tier. Therefore, being a starting-caliber fantasy QB is not the same as having a positional advantage. [Sigmund Bloom, quarterback tiers](https://www.footballguys.com/article/2026-quarterback-tiers-value-picks-may).

The same analyst's TE tiers separate Bowers and McBride from other usable TE options. This supports a small elite tier, not giving every nonelite TE a failing grade. Point gaps matter: TE ranks can be tightly packed below that tier. The particular names and outlooks are dated analyst judgments, not replacement projections for this app. [Sigmund Bloom, tight end tiers](https://www.footballguys.com/article/2026-tight-end-tiers-value-picks-may).

TE premium can make a second TE competitive with RBs and WRs in a FLEX slot. The Footballers' historical analysis also cautions against assuming every middling TE gains the same advantage. Its example uses 1.5 TE reception points versus 1.0 for other positions, so its numerical conclusions cannot simply be transferred to this league. [Matthew Betz, TE premium analysis](https://www.thefantasyfootballers.com/articles/how-to-value-tes-in-te-premium-leagues-fantasy-football/).

## Examples to set before running the grader

These are engineering choices derived from league role counts. No source publishes these exact examples or their letter grades. Rank means rank in the same custom-scored projection pool; close point totals should remain close even across a rank boundary.

| Position group | Strong example | Ordinary example | Weak example |
| --- | --- | --- | --- |
| QB starter | QB1 or QB2 | QB7 | QB18 |
| Two RB starters | RB3 and RB15 | RB7 and RB19 | RB19 and RB31 |
| Three WR starters | WR3, WR15, WR27 | WR7, WR19, WR31 | WR19, WR31, WR43 |
| TE starter | TE1 or TE2 | TE7 | TE18 |
| Two FLEX starters | Top part of remaining eligible pool | Middle of top 24 remaining eligible players | Both below the top 24 remaining eligible players |

The ordinary examples sit near the middle of each 12-player role band. The strong examples provide better players across those bands. The weak examples spend a required slot on a player below that slot's normal starter band. They test role quality, not whether a whole roster is affordable from a given draft position.

An ordinary group should have an ordinary label. A weak group should not earn a strong label solely because it retains a high percentage of the elite group's raw points. Conversely, a small projection gap should not produce a large letter gap merely because its position has a narrow spread. Exact letters must be documented separately from these semantic expectations.

For labels that mean strong, ordinary and weak at each position, explicit role-middle and below-starter references are more coherent than a common percentage-of-best cutoff. QB7 can be much closer to QB1 in raw points than TE7 is to TE1, yet both are ordinary starting roles. A best-in-role ratio is a valid description of distance from the best, but does not by itself establish ordinary quality. This is a design inference, not a claim that Footballguys uses role-middle letter anchors. Replacement is a separate lower reference and should reflect eligibility and actual supply rather than an arbitrary percentage of the elite player.

## Required cross-checks

- Filling a required slot with a better projected player must never lower that starter assessment.
- Holding the projection pool and other players fixed, improving a starter must not lower the team's overall assessment. A stronger player can increase the gap to his backup, but that is not evidence the entire roster became weaker.
- A below-starter-level reserve who can fill an otherwise empty absence slot provides more owned coverage than no reserve. That does not make him a strong starter or require his depth assessment to be excellent.
- Two teams with identical position groups must receive identical positional assessments, regardless of other teams' roster mistakes.
- Moving the best reserve into FLEX must count that player once as a starter. The remaining bench, not that FLEX player again, provides additional lineup coverage.
- Fixed-position depth and total lineup coverage are different. A bench WR cannot directly fill a required RB slot, but can fill FLEX after a starting FLEX RB moves to RB. Test that cross-position reassignment when measuring total coverage.
- A high-quality reserve can improve the lineup after an absence; multiple players who cannot improve any relevant replacement lineup are not automatically excellent depth.
- An undrafted player is not owned depth. Waiver availability can explain a shortfall, but must not turn an empty drafted bench into an excellent drafted bench.
- No backup QB behind an elite starter need not mean a poor overall roster. Six reserves cannot independently back up nine starting slots, and RB/WR/TE reserves can cover more than one eligible slot.
- Conditional handcuff upside cannot be measured faithfully from unconditional season projections alone. Keep this limitation visible; do not invent upside bonuses from low point totals or youth.
- A reserve upgrade that leaves every starting slot unchanged should help less than a comparable starter upgrade. The sources support that ordering, but not a particular 90/10 or 80/20 split.

## What this does not validate

These examples can reject contradictory labels and double counting. They cannot establish playoff odds, future realized performance, Footballguys parity, or a required league-wide grade distribution. A projection-only grader remains a description of its source's expectations. Historical outcome validation would require frozen pre-draft projections, league-specific lineups and realized results across multiple seasons.
