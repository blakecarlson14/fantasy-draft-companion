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

## Check

```bash
npm test
npm run check:live
npm run check:draft
npm run check:replay
```

The app polls Sleeper every 750 milliseconds without overlapping requests. It uses cached FantasyPros data within a 40-call daily safety limit and continues from cached secondary data when a feed fails.

Draft picks and the recommendation cards shown on each user turn are saved as JSON in `draft-logs/` for post-draft review. Logs never include the FantasyPros key.
