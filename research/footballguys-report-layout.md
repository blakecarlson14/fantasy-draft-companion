# Footballguys report layout: verified public example

Checked September 8, 2026. This concerns the redesigned Rate My Team, not the older Draft Dominator By Pos percentage FAQ.

## Confirmed structure

Footballguys staff member Simon Shepherd's August 13, 2025 launch announcement explicitly describes a "new grading system split down by position, starters and depth." It also distinguishes league reports from team reports. Therefore the starter/depth distinction itself was not invented by this project. This announcement does not publish the calculation or letter thresholds. [Official launch announcement](https://forums.footballguys.com/threads/new-rate-my-team-preview-let-us-know-what-you-think.817078/)

The public Shark Pool example's league overview lists team rank, team name, archetype, overall draft grade, and a team-report link. Its 12 overall grades are A-, B+, B+, B, B, B, B, B, B-, B-, B-, B-. That is one observed report, not a required distribution. [Public league report](https://www.footballguys.com/rate-my-team/2025/shark-pool-3-fbg-home-league-2)

The linked farfromforgotten team report shows:

- Overall Draft Grade A-, aggregate Starter Grade A-, aggregate Depth Grade B.
- Quarterback: starters B, depth C+.
- Running Back: starters C, depth A+.
- Wide Receiver: starters A+, depth F.
- Tight End: starters C+, depth A+.
- Team Defense: one grade, B-.
- League rank, playoff chances, positional upside, and narrative content.

These were verified in both the public server-rendered HTML and a Chromium browser, without an account. The detailed analysis is login-gated. No FLEX-specific grade appears in this example, despite its three-flex configuration. [Public team report](https://www.footballguys.com/rate-my-team/2025/shark-pool-3-fbg-home-league-2/farfromforgotten)

## Implications for this app

To match the verified presentation, simplify the league overview to overall grades and put the starter/depth pairs in each team's report. Four offensive positions produce eight positional grades. Aggregate starter/depth grades would be separate additional summaries, but should not be added without defensible calculations.

This evidence supports the category structure, not our weights, benchmarks, or thresholds. The example is a 2025 report displayed by the current website; it cannot establish which report version the user's dad used or the exact current grading formula. A screenshot/share link from that report would settle presentation differences. Do not describe an independently designed scoring formula as a copy of Footballguys.
