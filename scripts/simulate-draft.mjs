import { buildPlayers, nextPickForSlot, pickSlot, rankPlayers, simulateToUserPick } from "../public/ranking.js";

const response = await fetch("http://127.0.0.1:4173/api/bootstrap");
if (!response.ok) throw new Error(`Bootstrap failed: ${response.status}`);
const bootstrap = await response.json();
const data = source => source?.data ?? null;
const draft = data(bootstrap.draft);
const players = buildPlayers({
  projections: data(bootstrap.projections),
  adp: data(bootstrap.adp).players,
  fpRankings: data(bootstrap.fantasyPros.rankings)?.players || [],
  fpProjections: data(bootstrap.fantasyPros.projections)?.players || [],
  schedule: data(bootstrap.schedule)
});
const histories = bootstrap.history.map(data);
const slotToUser = Object.fromEntries(Object.entries(draft.draft_order).map(([owner, slot]) => [slot, owner]));
const picks = [];
const myRoster = [];
const decisions = [];

const lastUserPick = nextPickForSlot(draft.settings.teams * (draft.settings.rounds - 1), Number(draft.draft_order[bootstrap.config.userId]), draft.settings.rounds, draft.settings.teams, draft.settings.reversal_round);
for (let pickNo = 1; pickNo <= lastUserPick; pickNo += 1) {
  const slot = pickSlot(pickNo, draft.settings.teams, draft.settings.reversal_round);
  const owner = slotToUser[slot];
  let player;
  if (owner === bootstrap.config.userId) {
    const drafted = new Set(picks.map(pick => pick.player_id));
    const available = players.filter(candidate => !drafted.has(candidate.id));
    const nextPick = nextPickForSlot(pickNo, slot, draft.settings.rounds, draft.settings.teams, draft.settings.reversal_round);
    const ranked = rankPlayers(available, { roster: myRoster, currentPick: pickNo, nextPick, replacementPool: players });
    player = ranked[0];
    decisions.push({ pickNo, selected: player, positional: Object.fromEntries(["QB", "RB", "WR", "TE"].map(position => [position, ranked.find(candidate => candidate.position === position)])) });
    myRoster.push(player);
  } else {
    player = simulateToUserPick(players, { picks, draft, userId: bootstrap.config.userId, histories }).predictions[0]?.player;
  }
  if (!player) throw new Error(`No selection at pick ${pickNo}`);
  picks.push({ pick_no: pickNo, round: Math.ceil(pickNo / draft.settings.teams), draft_slot: slot, picked_by: owner, player_id: player.id, metadata: { position: player.position } });
}

const counts = Object.groupBy(myRoster, player => player.position);
console.log(myRoster.map((player, index) => `${index + 1}. ${player.name} (${player.position}, bye ${player.bye || "?"})`).join("\n"));
console.log(Object.fromEntries(Object.entries(counts).map(([position, group]) => [position, group.length])));
console.log("\nDecision audit:");
for (const decision of decisions) console.log(`Pick ${decision.pickNo}: ${decision.selected.name} ${decision.selected.position} | ${Object.entries(decision.positional).map(([position, player]) => `${position}=${player?.name || "none"}(${player?.score.toFixed(1) || "-"})`).join(" | ")}`);

const exceedsCeiling = (counts.QB?.length || 0) > 2 || (counts.RB?.length || 0) > 7 || (counts.WR?.length || 0) > 8 || (counts.TE?.length || 0) > 2;
const lacksMarketRank = myRoster.some(player => !Number.isFinite(player.adp) && !Number.isFinite(player.ecr));
if (myRoster.length !== 15 || !counts.QB?.length || !counts.RB?.length || !counts.WR?.length || !counts.TE?.length || exceedsCeiling || lacksMarketRank) {
  throw new Error("Simulated roster is incomplete or structurally invalid");
}
