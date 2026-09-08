# Draft grading methods beyond Footballguys

Researched September 8, 2026. Research only; no grading implementation changed. Sources are the providers' own explanations. Older articles describe their version at publication, not guaranteed current internals.

## FantasyPros

The NFL Draft Analyzer FAQ describes its draft score as total value over replacement player, comparing the roster's projected points with a replacement team available on waivers after the draft. It provides perspectives based on FantasyPros ECR, a user's cheat sheet, and an expert poll. The search index exposes this FAQ on the public post-draft route; opening that specific route failed during this research, while the generic route omitted the FAQ. [NFL Draft Analyzer FAQ](https://draftwizard.fantasypros.com/football/draft-analyzer/post-draft/?draftId=RGLw4t3v&sport=nfl)

A 2015 product-team explanation says power rankings, post-draft analysis, and player suggestions share a team-strength formula. It names league roster settings, value over replacement, bench-player valuation, projected points, and expert rankings as inputs, while explicitly retaining proprietary components. It also says the formula adjusts for weekly versus rest-of-season views. This establishes the historical design, not exact 2026 behavior. [FantasyPros product-team explanation](https://www.fantasypros.com/2015/10/my-playbook-enhancements-october-2015/)

The current support article describes overall, starter, and bench projected standings, position ranks, and draft insights. Separate views compare expert opinions and alternative picks. This supports separating roster evaluation from pick analysis in our own report. [What is the Draft Analyzer?](https://support.fantasypros.com/hc/en-us/articles/115001307347-What-is-the-Draft-Analyzer)

FantasyPros documents deriving projections from consensus rankings and historical player behavior, then applying custom league scoring. Its example explicitly boosts TE value in FLEX when TE receptions receive extra points. The documented enhanced tools include power rankings and league analysis. [Custom scoring documentation](https://support.fantasypros.com/hc/en-us/articles/360039535653-How-do-enhanced-rankings-and-tools-work-with-my-custom-scoring-i-e-non-default-settings-league)

I did not find a published NFL letter-grade conversion, fixed starter/bench percentage, or prescribed distribution of A through F in these sources. None justifies adopting 80/20 or mapping the league mean to a particular letter as a FantasyPros method.

Avoid a search trap: the support page titled "What is the Draft Score based on?" describes a default 5x5 roto/H2H assessment. It supports baseball-style category grading and should not be cited as proof of the NFL formula. Use the NFL-specific FAQ above instead. [Potentially misleading generic title](https://support.fantasypros.com/hc/en-us/articles/115001354808-What-is-the-Draft-Score-based-on)

## The Fantasy Footballers

Their official 2021 walkthrough says the overall grade evaluates the roster against their own projections. Starting-position evaluations follow the configured lineup; RB and WR receive depth grades. The report also identifies a positional difference maker, highest-risk player, lineup consistency, and which individual analyst likes the team most. Risk comes from the analysts' own player assessments. The article does not disclose numerical grade cutoffs, component weights, or establish that risk and consistency change the overall grade. Its description should not be treated as a verified 2026 formula. [Official Draft Analyzer walkthrough](https://www.thefantasyfootballers.com/articles/ultimate-draft-kit-review-draft-analyzer/)

The current product page continues to advertise a draft grade, roster analysis, and action plan, with custom scoring and their own projections. It does not publish the letter conversion. [Current Ultimate Draft Kit page](https://www.thefantasyfootballers.com/fantasy-football-draft-kit/)

## What this supports for our app

These are our conclusions, not claims about proprietary formulas:

- Evaluate a roster using one consistent player-value source and the actual scoring and lineup rules. Use that same valuation foundation when explaining how draft recommendations relate to the final roster.
- Measure surplus over relevant replacement options when comparing positions. Raw totals include scoring that almost any team can obtain and can obscure meaningful differences.
- Keep useful bench value distinct from starter strength. An average full lineup with one absent player still contains almost all starter points, so labeling that quantity "depth" does not make it a bench-strength measure.
- Keep pick bargains/reaches separate from the roster-strength grade. A good player at a good price can coexist with an ordinary positional unit.
- Treat letter thresholds as a separate calibration problem. These sources provide design principles, not an evidence-backed formula that can simply be copied. We should not retune letters until the roster metric and its benchmarks have been inspected.
- Use synthetic roster cases and, where possible, comparable historical drafts to test discrimination. A plausible-looking mix of letters is not evidence of predictive accuracy. Do not choose thresholds to reproduce Blake's reported B+.
