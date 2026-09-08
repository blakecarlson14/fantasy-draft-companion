# Roster grading audit

September 8, 2026. This reviews the original twelve drafted rosters using the unchanged frozen evaluation snapshot. It does not claim to reconstruct missing draft-day projections or reproduce Footballguys' formula.

## Findings before changing letters

The independent research agent established role examples without inspecting this league's grades: ordinary QB7, RB7/RB19, WR7/WR19/WR31 and TE7. The [research](independent-roster-benchmarks.md) supports positional opportunity costs and separate starter/reserve expectations. Selecting B for ordinary and A for strong is our presentation convention, not a published Footballguys rule.

Two findings warranted changes:

1. Dividing every role by its best player did not give ordinary groups comparable meanings. The former scale graded this snapshot's QB7 B- and TE7 D+, despite both occupying ordinary starter roles. WR groups benefited from later-role caps. That could be described as distance from the best, but not consistently as strong/ordinary/weak quality.
2. Improving Omar Cooper's projection by 40% lowered Tackles & Tantrums from B+ to B in the old model. Promoting him from bench to FLEX changed positional depth weights and lost overall credit. A better player should not make the roster worse.

The revision uses strong, ordinary and fringe role references and combines starter/reserve production before converting the overall letter. It keeps full projected FLEX production rather than capping it within a positional score. It does not adjust a team to match its external grade.

## All twelve teams

Position cells show starter/depth letters. Names and ranks below refer to this snapshot's custom-scored projections, not a claim of universal expert consensus.

| Team | Previous overall | Revised overall | QB | RB | WR | TE |
| --- | --- | --- | --- | --- | --- | --- |
| Fox | A- | A | B / A | A / F | A- / A+ | B- / A+ |
| Tackles & Tantrums | B+ | A- | B+ / A | A / A- | B / F | A- / A+ |
| Birds Aren't Real | B+ | B+ | A+ / C+ | B / B+ | B- / C+ | A- / A |
| beep boop | B+ | B+ | A- / B | A / D | B+ / A- | B / F |
| 59ers | B+ | B+ | B / A+ | B+ / C+ | A- / A | B- / F |
| Run N Gunz | B+ | B+ | C / F | C / A+ | A / A+ | A / F |
| VandyJay | B | B | B- / B | C- / A+ | A+ / D- | B / F |
| CeeDeez Nuts | B | B | C / A | B+ / B | D+ / F | A+ / B |
| vinnygee | B | B | B+ / A- | B / D- | C+ / F | C / B |
| BJ | B | B | A / B- | A / C- | C / B- | C- / A+ |
| cbraeger025 | B | B | B / A- | A- / D+ | A- / B- | C- / F |
| Bishop Sycamore Alumni | B | B- | A / F | D / B | B+ / B- | A+ / F |

### Individual review

- **Fox:** Gibbs/Swift provide a strong RB pair; Collins/Rice/Watson are strong relative to their WR roles. Tuten and Ferguson contribute at FLEX. Allgeier alone is thin RB cover, even though Goff, Schultz and three WR reserves support the overall reserve inventory. An A overall does not remove that RB exposure.
- **Tackles & Tantrums:** Derrick Henry/Achane and Warren supply strong starting groups. Tony Pollard/Hunter Henry contribute at FLEX. The reserve TE group and Jordan Mason support depth, but Cooper alone is weak projected WR cover. Nabers' snapshot injury flag makes the projection-based WR assessment less certain; no additional numerical penalty is invented.
- **Birds Aren't Real:** Allen supplies the best QB projection. Bijan helps offset Dowdle's weaker RB2 projection; Smith/McConkey/Tate are less dominant at their required WR roles. Andrews contributes at FLEX, not bench. Jacobs' frozen projection is only 80.2 points and his source status is NA; his recognizable name must not silently override that source expectation. His availability is a limitation of this projected-depth assessment, not a claim that he lacks talent.
- **beep boop:** Hurts and Cook/Brown form strong required positions. Pickens/Wilson/McLaurin are above the ordinary WR references; Sutton/Pittman contribute fully at FLEX. Fannin is near the ordinary TE band. WR reserves provide useful FLEX inventory, but Marks/Coleman remain low-projected RB cover and there is no owned TE reserve. Those are different weaknesses from a uniformly poor bench.
- **59ers:** London/Olave/Burden and Taylor/Judkins support the starter assessment. Nix is strong QB cover. Warren and Kelce are FLEX starters; Kelce cannot simultaneously make the TE bench deep. RB depth is weaker than the starting pair. The low TE-depth letter describes that allocation, not Kelce's total roster value.
- **Run N Gunz:** Smith-Njigba/Flowers/Evans and Loveland are strong groups; Dart and Jeanty/Henderson are nearer fringe starter references. Thomas/Okonkwo occupy FLEX. The RB/WR reserve pool is productive relative to reserve roles, but there is no QB/TE backup. Strong skill-position depth does not guarantee every required slot is covered.
- **VandyJay:** Chase/Brown/McMillan are a strong WR group, while Etienne/Price are weaker required RBs. Hubbard/Gainwell offer usable RB reserves; WR reserves are much weaker than the starters. Meyers/Strange are FLEX players. Kraft is around the ordinary TE band; no bench TE is available under the selected lineup.
- **CeeDeez Nuts:** Bowers is a true source-projected positional advantage. Hampton/Hall are a solid RB pair and Irving/Brooks contribute at FLEX. Waddle/Adams/Wilson lag their required WR roles, with only Doubs as a WR reserve. Mahomes is strong QB cover. These strengths and weaknesses should not be compressed into uniformly good positional letters just because the overall remains B.
- **vinnygee:** Burrow is above the ordinary QB reference. Walker/Love are ordinary as a pair; Skattebo adds FLEX production. Puka's elite projection does not make Metcalf/Addison elite WR2/WR3 options, and the WR bench is low-projected. Kincaid is closer to the fringe TE reference. The overall reserve grade is moderated by Stafford and the available skill-position inventory, not a guarantee of WR cover.
- **BJ:** Maye and McCaffrey/Williams are strong groups. Stevenson/Dobbins contribute at FLEX; neither is counted again as an RB reserve. Jefferson/Harrison/Moore and Hockenson sit below stronger role examples. Barner offers excellent TE reserve production relative to the reserve pool, which is not the same as an elite TE starter. Cross-position distinctions explain the mixed letters.
- **cbraeger025:** Barkley/Williams and Lamb/Egbuka/Williams provide strong groups. Lawrence is near the ordinary QB reference. Likely is weaker than ordinary TE references and Goedert is at FLEX, leaving no bench TE. RB reserve production is low. The B overall reflects the full lineup and useful Love/WR reserves without eliminating those holes.
- **Bishop Sycamore Alumni:** Jackson and McBride provide real positional advantages. Montgomery/Harvey are the weak required RB group; Pierce/Johnston add FLEX production. The WR group is above ordinary, but low total reserve production and no QB/TE backups limit the overall. RB depth can be stronger relative to reserve expectations than the same roster's RB starters are relative to starter expectations.

## Checks and remaining uncertainty

`npm test` and `npm run check:grading` are runnable evidence. The latter verifies independent role examples, 200 mock leagues, roster depletion and 720 individual upgrades across all 180 drafted players. All tested upgrades preserve or improve raw overall production. Fixed evaluation references then preserve score ordering. Recomputing a changed projection pool can change reference ranks, so that is a different experiment.

The revised ordinary mock rosters range from C- through A. Repeated-reach rosters range from F through C. Removing the bench reduced the overall letter in 99 of 100 cases, with one letter tie; it never improved one. All-zero production grades F. These results reject obvious contradictions but do not identify an optimal formula or prove future outcomes.

The reserve discount, six-role reference allocation and letter anchors remain explicit design choices. Whole-bench projected inventory is not an exact injury/bye simulation. A handcuff's conditional upside can be understated, and tight projection clusters can make adjacent letters less meaningful than they appear. The frozen source can also be wrong. No new news was used to overwrite its projections during this audit.

Conclusion: the two identified assessment defects are corrected, and the letters now have consistent role-based definitions. The twelve-team results are explainable under that definition. That is a narrower, supportable conclusion than claiming these are the best possible ratings or historically validated championship forecasts.
