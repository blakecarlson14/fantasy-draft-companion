import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildPlayers, nextPickForSlot, rankPlayers, selectRecommendations } from "../public/ranking.js";

const rehearsalId = process.argv[2] || "1400958200882155520";
const baseUrl = "http://127.0.0.1:4173";
const get = async path => {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  return response.json();
};
const data = source => source?.data ?? null;

const [real, rehearsal, realState] = await Promise.all([
  get("/api/bootstrap"),
  get(`/api/bootstrap?draft_id=${rehearsalId}`),
  get("/api/draft-state")
]);
const realDraft = data(real.draft);
const rehearsalDraft = data(rehearsal.draft);
const userId = real.config.userId;
const keys = ["teams", "rounds", "reversal_round", "slots_qb", "slots_rb", "slots_wr", "slots_te", "slots_flex", "slots_bn"];

assert.equal(real.config.draftId, real.config.leagueDraftId, "Default page is not using the league draft");
assert.equal(data(realState.draft).draft_id, real.config.leagueDraftId, "Live polling route is not using the league draft");
assert.equal(Number(realDraft.draft_order[userId]), 7, "Expected the real draft slot to be 7");
assert.equal(Number(rehearsalDraft.draft_order[userId]), 7, "Rehearsal did not use slot 7");
for (const key of keys) assert.equal(rehearsalDraft.settings[key], realDraft.settings[key], `Draft setting differs: ${key}`);

const players = buildPlayers({
  projections: data(real.projections),
  adp: data(real.adp).players,
  fpRankings: data(real.fantasyPros.rankings)?.players || [],
  fpProjections: data(real.fantasyPros.projections)?.players || [],
  schedule: data(real.schedule)
});
const { picks } = JSON.parse(await readFile(new URL(`../draft-logs/${rehearsalId}-picks.json`, import.meta.url)));
assert.equal(picks.length, realDraft.settings.teams * realDraft.settings.rounds, "Rehearsal log is incomplete");

let exactMatches = 0;
const replay = [];
for (const actual of picks.filter(pick => String(pick.picked_by) === userId)) {
  const prior = picks.filter(pick => pick.pick_no < actual.pick_no);
  const drafted = new Set(prior.map(pick => String(pick.player_id)));
  const roster = prior
    .filter(pick => String(pick.picked_by) === userId)
    .map(pick => players.find(player => player.id === String(pick.player_id)))
    .filter(Boolean);
  const available = players.filter(player => !drafted.has(player.id));
  const nextPick = nextPickForSlot(actual.pick_no, 7, realDraft.settings.rounds, realDraft.settings.teams, realDraft.settings.reversal_round);
  const choices = selectRecommendations(rankPlayers(available, {
    roster,
    currentPick: actual.pick_no,
    nextPick,
    replacementPool: players
  }));
  assert.equal(choices.length, 3, `Pick ${actual.pick_no} did not produce three choices`);
  assert.equal(choices.some(player => drafted.has(player.id)), false, `Pick ${actual.pick_no} recommended a drafted player`);
  const selected = choices.findIndex(player => player.id === String(actual.player_id));
  assert.notEqual(selected, -1, `Recorded selection at pick ${actual.pick_no} fell outside the current choices`);
  if (selected === 0) exactMatches += 1;
  replay.push(`${actual.pick_no}: ${choices[0].name}${selected ? ` (recorded pick now #${selected + 1})` : ""}`);
}

assert.equal(replay.length, realDraft.settings.rounds, "Did not replay every user pick");
console.log(`PASS: default and polling routes use real draft ${real.config.leagueDraftId} (${realDraft.status}, ${data(realState.picks).length} picks).`);
console.log(`PASS: completed mock ${rehearsalId} matches the real board: slot 7, 12 teams, 15 rounds, third-round reversal, identical roster slots.`);
console.log(`PASS: replayed all ${replay.length} decisions through current production rankings; ${exactMatches}/${replay.length} remain the top choice and every recorded pick remains in the top three.`);
console.log(replay.join(" | "));
