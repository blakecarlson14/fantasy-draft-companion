import { availabilityAt, buildPlayers, nextPickForSlot, rankPlayers, selectRecommendations, simulateToUserPick } from "../public/ranking.js";

const response = await fetch("http://127.0.0.1:4173/api/bootstrap");
if (!response.ok) throw new Error(`Bootstrap failed: ${response.status}`);
const bootstrap = await response.json();
const data = source => source?.data ?? null;
const players = buildPlayers({
  projections: data(bootstrap.projections),
  adp: data(bootstrap.adp).players,
  fpRankings: data(bootstrap.fantasyPros.rankings)?.players || [],
  fpProjections: data(bootstrap.fantasyPros.projections)?.players || [],
  schedule: data(bootstrap.schedule)
});
const simulation = simulateToUserPick(players, {
  picks: data(bootstrap.picks),
  draft: data(bootstrap.draft),
  userId: bootstrap.config.userId,
  histories: bootstrap.history.map(data)
});
const followingPick = nextPickForSlot(simulation.targetPick, 7, 15, 12, 3);
const plausible = players.filter(player => {
  const chance = availabilityAt(player, simulation.targetPick);
  return chance == null || chance >= 0.25;
});
const ranked = rankPlayers(plausible, { currentPick: simulation.targetPick, nextPick: followingPick, replacementPool: players });

console.log(`Target pick: ${simulation.targetPick}; following pick: ${followingPick}`);
console.log(`Predicted first six: ${simulation.predictions.map(item => `${item.pickNo}. ${item.player.name}`).join(" | ")}`);
console.log(ranked.slice(0, 10).map((player, index) =>
  `${index + 1}. ${player.name} ${player.position} score=${player.score.toFixed(1)} projection=${player.points.toFixed(1)} ADP=${player.adp} next=${player.availability?.toFixed(2)} risk=${player.risks.join(";") || "none"}`
).join("\n"));
console.log(`Cards: ${selectRecommendations(ranked).map(player => `${player.name} (${player.position})`).join(" | ")}`);

if (simulation.targetPick !== 7 || ranked.length < 100) throw new Error("Live ranking sanity check failed");
