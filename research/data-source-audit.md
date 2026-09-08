# Draft-night data-source audit

Checked September 2, 2026. This is a source audit, not a claim that every feed below belongs in the model.

## Bottom line

The app has enough data to run a defensible draft tonight. It re-ranks immediately when Sleeper records picks. After this audit, the app was changed to reload its existing source data every five minutes and its Sleeper projection cache was shortened to five minutes. News is shown to the user; it is not parsed into a projection adjustment. Sleeper injury fields affect the score when the projection payload carrying those fields reloads.

The biggest current gap is FantasyPros coverage. The free API response in `.cache/` contains zero consensus-ranking rows and only ten projection rows, all quarterbacks. FantasyPros marks both responses `public_api_limited: true` and `tier: free`. This means the nominal FantasyPros weight barely exists in practice.

Two changes could add useful signal after tonight, once they can be replay-tested:

1. Add free MyFantasyLeague ADP from completed, non-mock drafts as a third market check. Its public 2026 endpoint worked without authentication. A test query for 12-team, PPR, non-mock drafts returned 1,312 drafts over the last seven days. MFL only distinguishes PPR from non-PPR, so this should be a modest market input, not the projection base for this half-PPR and TE-premium league.
2. If the owner is willing to pay, activate a FantasyPros HOF production key. FantasyPros says HOF includes full personal-use production access to rankings, projections, players, news, and injuries with higher limits. That is the cleanest way to turn the intended ECR and second-projection inputs into full feeds. The advertised HOF price starts at $8.99 per month on an annual plan. [FantasyPros API and pricing](https://www.fantasypros.com/api-data/)

Do not add another generic rankings page just to increase the source count. Sleeper ADP, FFC ADP, MFL ADP, and FantasyPros ECR are correlated market opinions. More correlated feeds create false confidence unless the model tracks freshness and disagreement.

## What the model uses now

The current implementation in `public/ranking.js` and `server.mjs` works like this:

- Player projection: 55% FantasyPros plus 45% Sleeper when a matching FantasyPros projection exists; otherwise 100% Sleeper. With the current free FantasyPros sample, only ten quarterbacks can receive the blend.
- Base rank: 65% of the mean available market ranks and 35% projected value-over-replacement rank. Available market ranks are Sleeper half-PPR ADP, FFC half-PPR ADP, and FantasyPros ECR. FantasyPros currently contributes no ECR rows.
- Roster construction, positional need, next-pick availability, bye overlap, TE premium, playoff schedule, youth, injury status, and other smaller adjustments then move the score.
- Injury penalty: 20 points for IR, PUP, or out; 12 for doubtful; 4 for questionable.
- Pick state: Sleeper is polled every 750 milliseconds through a 250-millisecond server cache.
- Source cache windows: Sleeper projections 5 minutes; FFC ADP and FantasyPros rankings/projections 6 hours; FantasyPros aggregate news 60 minutes; Sleeper player news 1 minute. The browser reloads the non-pick sources every five minutes.

The 750-millisecond loop fetches only the draft and its picks. A separate five-minute reload checks projections, ADP, and source status. The "Refresh data" action also honors cache windows rather than forcing an upstream call.

## Source decisions

### Keep: Sleeper official draft API

This is authoritative for the board, settings, draft order, and picks. Sleeper documents a free, read-only API, requires no token, and asks clients to remain below roughly 1,000 calls per minute. Its draft-picks endpoint returns the player ID, overall pick, round, slot, and roster. The current polling rate is well inside that guidance. [Sleeper API introduction](https://docs.sleeper.com/#introduction), [Sleeper draft picks](https://docs.sleeper.com/#get-all-picks-in-a-draft)

Sleeper also documents player metadata, including injury status, practice participation, depth-chart order, external IDs, and a search rank. It says the large player map should be fetched at most once per day. That map is useful for identity and status, not a minute-by-minute ranking feed. [Sleeper players](https://docs.sleeper.com/#fetch-all-players)

Sleeper's official trending endpoint reports adds and drops over a configurable lookback period. It is useful as an alert after breaking news, but it is waiver behavior across Sleeper leagues, not redraft ADP. Treat it as a small warning flag at most. [Sleeper trending players](https://docs.sleeper.com/#trending-players)

The app's Sleeper projections and per-player news URLs are not in Sleeper's published API documentation. They work now, but they need stale-data fallback because Sleeper has not promised their response shape or availability.

### Keep: Fantasy Football Calculator ADP

FFC supplies a recent independent half-PPR mock-draft market. The cached response currently covers 3,142 drafts from August 28 through September 2 and has 233 players. FFC's public page labels separate PPR, half-PPR, standard, two-QB, dynasty, and rookie ADP views, and reports the date range and number of mocks behind the table. [FFC ADP](https://fantasyfootballcalculator.com/adp)

This is useful for "will he make it back?" and disagreement warnings. It should not drive season value because mock behavior and actual drafts differ.

### Add: MyFantasyLeague actual-draft ADP

The public endpoint returned current 2026 data without a key:

```text
https://api.myfantasyleague.com/2026/export?TYPE=adp&JSON=1&FRANCHISES=12&IS_MOCK=0&IS_PPR=1&DAYS=7
```

MFL hosts live drafts and says empty slots in its public mocks use its ADP rankings, so filtering `IS_MOCK=0` is important. [MFL public mock drafts](https://php01.myfantasyleague.com/mockdrafts/public.php)

Material value: moderate. It adds actual-draft behavior rather than another set of projections. Use it to estimate availability and flag market movement. Weight it below Sleeper ADP because Sleeper is the platform being drafted on and MFL's PPR filter does not match half-PPR plus full-PPR tight ends exactly.

### Upgrade if convenient: FantasyPros production API

FantasyPros documents consensus rankings with ECR, ADP, tiers, best/worst ranks, and standard deviation; preseason and weekly projections; player news; and injuries. Requests use an API key in `x-api-key`. [FantasyPros API reference overview](https://www.fantasypros.com/api-data/)

The free key is a prototype tier. Our live responses prove the practical limitation: zero ECR rows and ten sampled projection rows. A HOF production key is the only paid source I would recommend before tonight because the app already has the integration and intended weighting. Before trusting it, verify that the production projections response says `scoring: HALF` and includes RB, WR, and TE rows. The current free projection payload says `scoring: STD` despite the request asking for half-PPR.

Material value: high if it unlocks full ECR and projections; near zero with the current free sample.

### Use beside the app tonight: Footballguys Draft Dominator

Footballguys says its current Draft Dominator syncs live with Sleeper and adjusts recommendations to league settings. Its paid tools also expose custom rankings, projections, tiers, and downloadable spreadsheets. [Footballguys plans](https://www.footballguys.com/plans), [classic drafting downloads](https://www.footballguys.com/article/footballguys-classic-drafting-apps)

This is credible independent advice, but importing its data into this model ninety minutes before the draft would require export cleanup, player matching, a new weighting choice, and replay testing. Use Draft Dominator as a side-by-side second opinion tonight. Do not blend it into the recommendation score without validation.

### Use as alerts, not a hidden numerical model: official NFL injuries and transactions

NFL.com publishes current official injury reports and a transaction log. These are the right places to confirm a late scratch, IR move, signing, or trade. [NFL injuries](https://www.nfl.com/injuries/), [NFL transactions](https://www.nfl.com/transactions/)

There is no documented, free NFL.com public API here that is suitable for automatic polling. Scraping these pages on draft night adds fragility. FantasyPros production injuries/news or Sleeper status updates are cleaner machine-readable routes. Keep direct NFL links available for manual verification of any severe alert.

The unauthenticated ESPN injuries endpoint responded successfully in testing, but ESPN does not publish it as a supported developer API. Its response was about 8.9 MB. It is a poor draft-night dependency compared with FantasyPros or Sleeper.

### Skip tonight: sportsbook odds

The Odds API has a free 500-credit monthly tier and supports NFL game totals plus player passing, rushing, receiving, reception, and touchdown props. Additional markets update about once per minute and must be requested one event at a time. [The Odds API pricing](https://the-odds-api.com/), [NFL player-prop markets](https://the-odds-api.com/sports-odds-data/betting-markets.html), [usage costs](https://the-odds-api.com/liveapi/guides/v4/)

Those are mostly Week 1 game expectations, not season-long projections. Converting them into draft values tonight would require vig removal, player-name matching, missing-market handling, and a defensible season extrapolation. It would also double-count injury and role news already reflected in the betting market. This is too much model risk for too little gain before one draft. Add odds later only as a bounded tie-breaker after backtesting.

### Skip: free SportsDataIO trial and delayed hobby tier

SportsDataIO says its free trial data is scrambled and cannot be used for analysis. Its self-serve Discovery Lab data is delayed by one day. Real-time, production-quality injuries, depth charts, news, odds, and projections require commercial access. [SportsDataIO access levels](https://sportsdata.io/developers/apis)

Neither option improves tonight's rankings.

### Skip for now: Sportradar

Sportradar documents NFL injury and depth-chart feeds with trial and production access levels, but it requires another authenticated integration and ID mapping. The depth-chart feed itself is useful, but the app already gets depth and injury state through Sleeper and can get a fuller injury feed through FantasyPros production. [Sportradar weekly depth charts](https://developer.sportradar.com/football/v5/reference/nfl-weekly-depth-charts), [Sportradar NFL overview](https://developer.sportradar.com/football/reference/nfl-overview)

This is redundant for tonight unless a production Sportradar key already exists.

## Recommended order before the draft

1. Tonight, keep the replay-tested ranking inputs fixed and use Footballguys Draft Dominator as a separate check if the subscription includes it.
2. After the draft, test MFL non-mock ADP at a smaller availability weight than Sleeper ADP.
3. Treat severe status changes as hard controls. IR, PUP, or out should remove a player from recommendations until acknowledged. News text should remain an alert unless a structured injury/status field confirms it.
4. Before the next draft, consider FantasyPros production and validate row count, positions, scoring type, and freshness before enabling its 55% projection share.
5. Do not add odds, SportsDataIO, Sportradar, or an undocumented ESPN dependency tonight.

The app should also expose the effective weights, not only the intended weights. Tonight that means saying plainly that most non-QB projections are 100% Sleeper and market rank is usually a Sleeper/FFC blend because the free FantasyPros ECR feed is empty.
