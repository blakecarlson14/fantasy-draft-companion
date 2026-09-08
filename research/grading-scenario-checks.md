# Grading scenario checks

Run September 8, 2026 with the existing frozen evaluation snapshot. No projections, real picks, thresholds, or grading weights changed during this exercise.

## Method

`npm run check:grading` runs `scripts/check-grading.mjs`. It needs the ignored local grading snapshot; an alternate snapshot path can be passed directly to the script. It makes no network requests and writes no files.

Generate 100 ordinary 12-team, 15-round snake drafts using the snapshot's half-PPR ADP with seeded price variation. Rotate four roster constructions across teams: QB/RB/WR/TE counts of 2/4/7/2, 1/5/8/1, 2/5/7/1, and 1/6/6/2. Discourage early backup QB/TE picks. Each draft has unique players and fills the required nine starter slots. These are plausible simplified draft scenarios, not a claim to reproduce actual manager behavior. ADP also does not fully account for this league's TE premium.

Generate another 100 drafts in which one team repeatedly chooses the thirty-first available candidate after ranking eligible players by the same ADP-based cost. This provides a systematically weak selection scenario with real projected players, rather than only artificial zeroes.

For each ordinary draft, separately replace one team's bench with known zero-production players, then replace its entire roster. Keep the original player pool intact so that reference ranks cannot move in response to these stress scenarios. These artificial cases test failures of depth and roster strength; they are not realistic draft forecasts.

The mock drafting logic never calls the live recommendation engine, uses actual league picks, or considers any team's reported Footballguys grade. It shares the frozen player source and league rules with the grader, so it is a scenario check, not independent-source or out-of-sample outcome validation.

## Results

| Scenario | Roster count | Overall results |
| --- | --- | --- |
| Ordinary ADP-driven drafts | 1,200 | 13 A-, 191 B+, 732 B, 229 B-, 30 C+, 5 C |
| Repeated reaches | 100 | 1 C+, 22 C, 25 C-, 30 D+, 18 D, 4 D- |
| Remove owned bench | 100 | 6 B, 44 B-, 38 C+, 11 C, 1 C- |
| Remove all projected production | 100 | 100 F |

Removing the bench lowered the overall letter in every tested case without changing the starter letter. Repeated reaches produced lower grades than the same seed's ordinary team in 99 cases and the same letter in one case. Letter ties are allowed; the check does not require every production change to cross a band. Every ordinary roster had a legal nine-player lineup. Missing data handling and identity/FLEX invariants remain covered by `npm test`.

## Decision and limits

Retain the current reference-role scale and weights. These checks show that the scale distinguishes ordinary, weak, and depleted rosters without forcing the actual league into predefined bands. They do not uniquely establish the thresholds or demonstrate that 90/10 is an optimal starter/depth weighting.

The real league's B-through-A- range is therefore not, by itself, grounds for another adjustment. The [verified Footballguys example](footballguys-report-layout.md) also has a narrow overall range, although that cannot validate our specific grades.

The user accepted that example as the presentation target. Keep its league/team hierarchy and positional starter/depth distinctions. Do not copy unsupported playoff probabilities, numerical upside forecasts, or brand assets. Describe these as our scenario-checked roster estimates, not Footballguys' grades or historically validated playoff predictions.
