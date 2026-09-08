# Draft grading methodology research

Researched September 8, 2026. Research only; no grading code or saved evaluation inputs were changed. The user withdrew the earlier A/F definitions. The application's current letters should be treated as provisional, not as a validated grading method.

## Findings from Footballguys

### A published positional benchmark exists

Footballguys' June 2024 support article describes Draft Dominator's **By Pos percentage ratings**. In a 12-team league starting two RBs, it compares a team's first RB with the league's RB1 and its second with RB13. It also estimates expected bench allocation from lineup and bench sizes, prioritizes starters in the combined result, and mentions a separate FLEX allocation algorithm. It does not publish that algorithm or letter cutoffs. This is a specific reference-slot method, not an average-team benchmark. [Official positional rating documentation](https://sportsguys.zendesk.com/hc/en-us/articles/360007826713-Understanding-Roster-By-Pos-Ratings)

Important boundary: these are percentage ratings for By Pos, not a verified specification of the current Rate My Team letter grades.

### The current report has changed since those support articles

The August 2025 announcement by Footballguys administrator Simon Shepherd describes a new grading system with position, starter, and depth breakdowns, separate team/league reports, and AI-generated report text guided by Footballguys data. It does not disclose the score-to-letter mapping or demonstrate that AI assigns the numerical grades. [First-party announcement](https://forums.footballguys.com/threads/new-rate-my-team-preview-let-us-know-what-you-think.817078/)

The current landing page confirms league settings, positional analysis, grades, projections, and league comparisons as product features. It is not a methodology specification. [Rate My Team](https://www.footballguys.com/rate-my-team)

### Recommendation and evaluation can use different viewpoints

Footballguys' June 2024 FAQ says Draft Dominator blends experts, while Rate My Team can report from an individual selected expert's perspective. This documents a legitimate source of disagreement, but it predates the 2025 redesign. It does not prove that every current report still uses precisely that approach. [Official explanation of differing advice](https://sportsguys.zendesk.com/hc/en-us/articles/115001244633-Why-Are-The-Draft-Dominator-Rankings-Vs-Rate-My-Team-Different)

Draft Dominator also documents separate factors for player value, positional need, expected drop-off before the next pick, and upside projections with greater emphasis later in a draft. This explains why a good selection at a particular pick need not be an elite starter. It does not establish the current report's grading weights. [Official strategy explanation](https://sportsguys.zendesk.com/hc/en-us/articles/360007697334-Value-Based-Drafting-And-Other-Strategies)

### Raw season totals are not their entire valuation model

Footballguys documents adjusting raw projected fantasy points for expected missed games using replacement production. The reason is that concentrated per-game production can be worth more than a season total suggests. [Official projection calculation explanation](https://sportsguys.zendesk.com/hc/en-us/articles/8439912431259-How-Projections-Are-Calculated)

This supports considering games played and actual coverage opportunities. It does not justify automatically treating undrafted players as strong owned bench depth or adding a universal replacement bonus to every player.

### What the research did not establish

No exact current Rate My Team A+/A/A− cutoffs, complete FLEX formula, starter/depth weighting, or public outcome-validation study was found in the official pages inspected. No private account was accessed and no league was uploaded. The available evidence supports borrowing specific principles, not claiming to reproduce Footballguys' proprietary grades. The user's B+ on a different scoring system is not sufficient to infer a formula.

## Why this application's grades swung between extremes

These are findings from local code, not claims about Footballguys.

1. The initial formula standardized every component around 75 with ten points per league standard deviation, then applied ordinary school-style thresholds. That imposes a C-centered distribution even when all teams are competitive.
2. The first positional calculation added FLEX players into fixed-position totals. That compared unequal starter counts. The later equal-slot correction is worth retaining.
3. The current benchmark averages the highest projected players needed to fill a 12-team league. With most relevant players drafted, typical teams naturally approach that reference. Mapping near-reference totals directly to A produces broad grade inflation. The frozen healthy lineup ratios are approximately 0.966–1.040.
4. The current overall formula is `0.8 × healthy production + 0.2 × average production with one starter absent`. With nine starters and no replacement production at all, average absence production is `8/9 × healthy production`. The result is therefore `0.97778 × healthy production`: losing all replacement support costs only about 2.22% of the original total. Calling this “20% depth” overstated its practical influence.
5. Current depth grades include a hypothetical undrafted player and compare recovered production with only 65% of typical starter production. This can give excellent depth grades without owned reserves. It measures optimistic coverage, not just the drafted bench.
6. Local checks showed 13 of the user's 15 player point values unchanged from the draft logs, including Fannin at 180.4. QB source/scoring paths differ. The grading disagreement therefore cannot be explained mainly by new information.

Evidence: [current implementation](../draft-report.mjs), [draft recommendation logic](../public/ranking.js), and ignored local draft logs/snapshot. The implementation at research time is commit `4ef74b6`. Those logs are not committed to the repository.

## Recommended direction, not an implemented specification

Separate the underlying roster assessment from the presentation layer that assigns letters. Do not choose an intended grade distribution for these 12 teams or target the user's Footballguys B+.

- Use the same scoring and player valuation inputs throughout the draft-tool comparison. Keep projections, ranks, and upside evidence distinct; do not combine incompatible source dates silently.
- Compare starter roles against explicit positional reference slots. Footballguys' documented By Pos approach is a defensible inspiration, but should be identified as such rather than represented as its current letter-grade formula.
- Keep equal-slot positional comparisons and correct FLEX accounting. Show why a strong FLEX lineup may improve overall strength without implying that the base TE or WR grade should change.
- Evaluate the **owned bench** separately from waiver fallback. Value reserve roles and usable alternatives; disclose uncertainty about breakout candidates instead of declaring low season projections proof of no upside.
- Choose overall aggregation only after inspecting its sensitivity. Demonstrate how changing starter quality, losing usable depth, and leaving position holes affect the result. Do not label a nominal coefficient as a real contribution without checking its effect.
- Calibrate letters on an independent set of realistic drafted rosters and deliberately weak rosters, spanning balanced builds, shallow stars, strong depth, and different FLEX constructions. Mock-roster calibration can establish a consistent grading scale; only separate historical outcome evaluation can support predictive claims.
- Retain league ranks internally for comparison, but do not force twelve unique letters or a required number of As/Fs. Publish the eventual conversion and its limitations in the methodology notes, even though the report UI remains letter-only.

The next development step should be a small, inspectable scoring comparison and calibration exercise, not another immediate replacement of the live grades. Footballguys' exact letter bands remain unknown; selecting ours will still require explicit judgment and validation.
