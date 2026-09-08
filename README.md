# Draft Night

Local draft companion for the 2026 Minnesota Madness Sleeper draft.

## Run

```bash
cd ~/fantasy-draft-companion
npm start
```

Open <http://localhost:4173> from macOS. Paste the FantasyPros key into the local setup field. The key stays in the running Node process and is not written to disk.

## Draft night

1. Start the app 15–30 minutes before the draft and open <http://localhost:4173>.
2. Paste the FantasyPros key if the setup field is visible.
3. Confirm the header says **LEAGUE** and shows the real draft status. Do not enter a mock draft URL.
4. Keep Sleeper open beside the companion. Make the pick in Sleeper; the companion is read-only.
5. Leave the companion open. Completed picks and recommendations update automatically.

The browser checks Sleeper for picks every 750 milliseconds, backed by a 250-millisecond server cache. You do not need to click **Refresh data** after picks. Use it once before the draft, after meaningful late news, after waking the computer or reconnecting the network, or if a source warning appears. It reloads sources whose safe cache window has expired: Sleeper projections every 10 minutes, player news every minute, and FantasyPros/FFC data every six hours. It does not bypass those limits.

Use the **New mock draft** button to paste a Sleeper draftboard URL. Mock mode stays in that tab's URL, so a separate tab can keep following the league draft.

## Draft report

Open <http://localhost:4173/report.html> or select **Draft report** in the companion header. The league overview shows each team's overall grade. Select one team for its overall starter/depth summaries, positional grades, explanations, injury flags, and drafted roster. The structure follows the verified Footballguys example; calculations use our own data and documented formula.

Run `npm run check:grading` to check the scale against independent ADP-driven mock leagues and depleted rosters using the frozen snapshot. These scenario checks do not establish playoff prediction accuracy.

The complete draft-day projection dataset was not preserved. The report therefore uses the approved fallback: a dated snapshot of current Sleeper season projections, scored with the league's rules. It is explicitly labeled as a later evaluation of the original drafted rosters. It does not follow subsequent transactions.

The first complete evaluation is saved in `draft-logs/grading-snapshot-2026.json`. Keep this file to preserve the same report across restarts or machines; it is intentionally excluded from Git with the other draft logs. A fresh checkout fetches the completed draft and creates its own dated snapshot. Incomplete projection coverage shows an unavailable explanation instead of freezing misleading grades.

The scoring method and its limitations are documented in [the grading requirements](docs/draft-grading-requirements.md). Numerical grading scores are internal; the report displays letters only.

### Documentation and saved reports

The current implementation includes role-based strong/ordinary/fringe benchmarks, separate positional and overall reserve assessments, full FLEX credit, and a correction for the bench-to-FLEX upgrade regression. The report follows the verified Footballguys presentation, not its unpublished grading formula. The original drafting recommendations are unchanged by the grading work.

- [Current grading requirements and formula](docs/draft-grading-requirements.md)
- [Verified Footballguys report structure](research/footballguys-report-layout.md)
- [Independent football benchmarks and sources](research/independent-roster-benchmarks.md)
- [Twelve-team audit, grade changes, and remaining limitations](research/roster-grading-audit.md)
- [Earlier methodology research](research/draft-grading-methodology.md) and [alternative approaches](research/draft-grading-alternatives.md)
- [Historical scenario results](research/grading-scenario-checks.md), superseded by the audit and current check script

Shareable PNGs from the completed audit are checked into the repository:

- [League overview](docs/images/league-overview.png)
- [beep boop breakdown](docs/images/beep-boop.png)
- [59ers breakdown](docs/images/59ers.png)
- [Tackles & Tantrums breakdown](docs/images/tackles-and-tantrums.png)

These are static captures of the September 8, 2026 evaluation, not live reports. They include the evaluation date and source caveat. Older experimental screenshots remain local under `draft-logs/` and are not published. To reproduce the same evaluation on another machine, copy the frozen snapshot separately; cloning the repository alone does not restore it. Never commit credentials, caches, or raw draft logs.

## Check

```bash
npm test
npm run check:live
npm run check:draft
npm run check:replay
npm run check:grading
```

The completed grading audit passed 35 automated tests, independent role examples, 200 mock leagues, 720 player-upgrade checks, and desktop/mobile browser checks. These establish defined behavior, not historical playoff prediction accuracy. `check:grading` requires the locally saved snapshot; the other scripts have their own live/cache requirements.

The app polls Sleeper every 750 milliseconds without overlapping requests. It uses cached FantasyPros data within a 40-call daily safety limit and continues from cached secondary data when a feed fails.

Draft picks and the recommendation cards shown on each user turn are saved as JSON in `draft-logs/` for post-draft review. Logs never include the FantasyPros key.
