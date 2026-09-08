import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildReport, projectedPoints, qualityScore, letter, rosterProduction } from "../draft-report.mjs";

// Independent ADP-driven mock drafts; never use actual picks, team identities, or target grades.
// ponytail: scenario calibration, not a weekly simulation or historical outcome backtest.
const source = JSON.parse(await readFile(process.argv[2] || "draft-logs/grading-snapshot-2026.json", "utf8"));
const positions = ["QB", "RB", "WR", "TE"];
const targets = [[2, 4, 7, 2], [1, 5, 8, 1], [2, 5, 7, 1], [1, 6, 6, 2]];
const grades = ["F", "D-", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+"];
const strength = grade => grades.indexOf(grade);
const pool = source.projections.filter(record => positions.includes(record.player?.position) &&
  Number.isFinite(projectedPoints(record, source.league.scoring_settings)) && record.stats.adp_half_ppr > 0 && record.stats.adp_half_ppr < 999);
assert.ok(pool.length >= 240, "Need a full ADP/projection pool for independent mock drafts");
const counts = { ordinary: {}, reaches: {}, depletedBench: {}, missedPicks: {} };
const count = (group, grade) => { counts[group][grade] = (counts[group][grade] || 0) + 1; };
let benchDrops = 0;
let reachDrops = 0;
const ordinaryGrades = new Map();
for (let seed = 1; seed <= 100; seed++) for (const mode of ["ordinary", "reaches"]) {
  let state = seed;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const snapshot = { ...source, users: [], picks: [], draft: { ...source.draft, draft_order: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`mock-${i}`, i + 1])) } };
  const available = [...pool];
  const rosters = Array.from({ length: 12 }, () => [0, 0, 0, 0]);
  for (let round = 0; round < 15; round++) for (let turn = 0; turn < 12; turn++) {
    const team = round % 2 ? 11 - turn : turn;
    const target = targets[(seed + team) % targets.length];
    const candidates = available.filter(record => rosters[team][positions.indexOf(record.player.position)] < target[positions.indexOf(record.player.position)])
      .map(record => ({ record, cost: record.stats.adp_half_ppr * Math.exp((random() - .5) * .7) +
        (round < 8 && ["QB", "TE"].includes(record.player.position) && rosters[team][positions.indexOf(record.player.position)] ? 100 : 0) }))
      .sort((a, b) => a.cost - b.cost);
    assert.ok(candidates.length, "Mock construction must fill all 15 picks");
    const record = candidates[mode === "reaches" && team === 0 ? Math.min(30, candidates.length - 1) : 0].record;
    available.splice(available.indexOf(record), 1);
    rosters[team][positions.indexOf(record.player.position)]++;
    snapshot.picks.push({ player_id: record.player_id, draft_slot: team + 1, pick_no: snapshot.picks.length + 1 });
  }
  const report = buildReport(snapshot);
  assert.equal(report.warning, null);
  for (const team of report.teams) {
    assert.equal(team.roster.filter(player => player.slot !== "Bench").length, 9);
    if (mode === "ordinary") count("ordinary", team.overall);
  }
  const team = report.teams.find(team => team.owner === "mock-0");
  if (mode === "reaches") {
    assert.ok(strength(team.overall) <= strength(ordinaryGrades.get(seed)), `Reach scenario ${seed}: ${team.overall} vs ordinary ${ordinaryGrades.get(seed)}`);
    if (strength(team.overall) < strength(ordinaryGrades.get(seed))) reachDrops++;
    count("reaches", team.overall);
    continue;
  }
  ordinaryGrades.set(seed, team.overall);
  for (const [group, depleted] of [["depletedBench", team.roster.filter(player => player.slot === "Bench")], ["missedPicks", team.roster]]) {
    const ids = new Set(depleted.map(player => player.id));
    const changedRecords = [];
    const changed = { ...snapshot, projections: [...snapshot.projections], picks: snapshot.picks.map(pick => {
      if (!ids.has(String(pick.player_id))) return pick;
      const original = pool.find(record => String(record.player_id) === String(pick.player_id));
      const id = `zero-${pick.player_id}`;
      changedRecords.push({ ...original, player_id: id, stats: { rec: 0 } });
      return { ...pick, player_id: id };
    }) };
    changed.projections.push(...changedRecords);
    const result = buildReport(changed).teams.find(team => team.owner === "mock-0");
    assert.ok(strength(result.overall) <= strength(team.overall), "Losing production cannot improve overall");
    if (group === "missedPicks") assert.equal(result.overall, "F");
    else {
      assert.equal(result.depth, "F");
      assert.equal(result.starters, team.starters);
      if (strength(result.overall) < strength(team.overall)) benchDrops++;
    }
    count(group, result.overall);
  }
}
assert.ok(benchDrops > 0, "Owned depth must have observable influence on overall grades");
// Independent role examples were established in research before looking at league letters.
const scored = source.projections.filter(record => positions.includes(record.player?.position)).map(record => ({
  id: String(record.player_id), position: record.player.position, points: projectedPoints(record, source.league.scoring_settings),
})).filter(player => Number.isFinite(player.points)).sort((a, b) => b.points - a.points);
const roleExamples = {};
for (const [position, roles] of [["QB", 1], ["RB", 2], ["WR", 3], ["TE", 1]]) {
  const group = scored.filter(player => player.position === position);
  roleExamples[position] = {};
  for (const [label, rank] of [["strong", 3], ["ordinary", 7], ["weak", 19]]) {
    const exampleRank = label === "weak" && roles === 1 ? 18 : rank;
    const score = Array.from({ length: roles }, (_, index) => qualityScore(group[index * 12 + exampleRank - 1].points, [0, 2, 6, 11].map(offset => group[index * 12 + offset].points))).reduce((a, b) => a + b, 0) / roles;
    roleExamples[position][label] = letter(score);
  }
  assert.equal(roleExamples[position].strong, "A");
  assert.equal(roleExamples[position].ordinary, "B");
  assert.ok(strength(roleExamples[position].weak) < strength("B"));
}
const real = buildReport(source);
let upgrades = 0;
for (const team of real.teams) {
  const roster = team.roster.map(player => scored.find(candidate => candidate.id === player.id));
  for (const player of roster) for (const factor of [1.01, 1.1, 1.4, 2]) {
    assert.ok(rosterProduction(roster.map(candidate => candidate.id === player.id ? { ...candidate, points: candidate.points * factor } : candidate)).overall >= rosterProduction(roster).overall);
    upgrades++;
  }
}
console.log(JSON.stringify({ ordinaryMockLeagues: 100, reachMockLeagues: 100, ordinaryRosters: 1200, benchDrops, reachDrops, playerUpgradeChecks: upgrades, roleExamples, counts }, null, 2));
