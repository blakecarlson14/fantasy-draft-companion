import test from "node:test";
import assert from "node:assert/strict";
import { availabilityAt, buildPlayers, nextPickForSlot, parseDraftId, pickSlot, rankPlayers, selectRecommendations, simulateToUserPick } from "../public/ranking.js";

test("Sleeper draft URLs and raw IDs resolve to a draft ID", () => {
  const id = "1384626278170103808";
  assert.equal(parseDraftId(id), id);
  assert.equal(parseDraftId(`https://sleeper.com/draft/nfl/${id}?ftue=commish`), id);
  assert.equal(parseDraftId("not a draft"), null);
});

test("league scoring is half PPR with an extra half point for TE receptions", () => {
  const projections = [
    { player_id: "te", team: "CLE", stats: { pts_half_ppr: 100, rec: 50, adp_half_ppr: 80 }, player: { first_name: "Test", last_name: "TE", position: "TE", team: "CLE" } },
    { player_id: "wr", team: "DAL", stats: { pts_half_ppr: 100, rec: 50, adp_half_ppr: 80 }, player: { first_name: "Test", last_name: "WR", position: "WR", team: "DAL" } }
  ];
  const players = buildPlayers({ projections });
  assert.equal(players.find(player => player.id === "te").points, 125);
  assert.equal(players.find(player => player.id === "wr").points, 100);
});

test("a tiny FFC draft sample does not override Sleeper ADP", () => {
  const players = buildPlayers({
    projections: [{ player_id: "1", team: "MIA", stats: { pts_half_ppr: 120, adp_half_ppr: 150 }, player: { first_name: "Ollie", last_name: "Gordon", position: "RB", team: "MIA" } }],
    adp: [{ name: "Ollie Gordon II", adp: 52, times_drafted: 6 }]
  });
  assert.equal(players[0].adp, 150);
  assert.equal(players[0].adpSource, "Sleeper");
});

test("Sleeper ADP remains authoritative when FFC has a large sample", () => {
  const players = buildPlayers({
    projections: [{ player_id: "1", team: "LV", stats: { pts_half_ppr: 120, adp_half_ppr: 182.7 }, player: { first_name: "Tre", last_name: "Tucker", position: "WR", team: "LV" } }],
    adp: [{ name: "Tre Tucker", adp: 130.2, times_drafted: 89 }]
  });
  assert.equal(players[0].adp, 182.7);
  assert.equal(players[0].adpSource, "Sleeper");
});

test("credible secondary ADP can break a valuation tie without replacing Sleeper ADP", () => {
  const sleeperConsensus = { id: "consensus", position: "WR", points: 200, adp: 100, secondaryAdp: 100, yearsExp: 3 };
  const externalValue = { id: "value", position: "WR", points: 200, adp: 100, secondaryAdp: 80, yearsExp: 3 };
  assert.equal(rankPlayers([sleeperConsensus, externalValue], { currentPick: 90, nextPick: 105 })[0].id, "value");
  assert.equal(externalValue.adp, 100);
});

test("draft value and source disagreements explain their direction", () => {
  const candidate = { id: "value", position: "WR", points: 220, adp: 100, secondaryAdp: 66, yearsExp: 3 };
  const lower = { id: "lower", position: "WR", points: 180, adp: 120, secondaryAdp: 120, yearsExp: 3 };
  const ranked = rankPlayers([candidate, lower], { currentPick: 90, nextPick: 105 });
  assert.equal(ranked[0].valueVsPick, 90 - ranked[0].baseRank);
  assert.ok(ranked[0].risks.includes("ADP disagreement: Sleeper 100, FFC 66; Sleeper drafters may let him fall"));
  assert.ok(!ranked[0].risks.some(risk => risk.startsWith("market and projection ranks differ")));
});

test("VORP keeps a fixed league replacement baseline as players are drafted", () => {
  const quarterbacks = Array.from({ length: 13 }, (_, index) => ({ id: `q${index + 1}`, position: "QB", points: 300 - index * 10, adp: index + 1, yearsExp: 3 }));
  const fullDraft = rankPlayers(quarterbacks, { currentPick: 1 });
  const lateDraft = rankPlayers([quarterbacks[4], quarterbacks[12]], { currentPick: 100, replacementPool: quarterbacks });
  assert.equal(lateDraft.find(player => player.id === "q5").vorp, fullDraft.find(player => player.id === "q5").vorp);
});

test("negative VORP is never described as value over replacement", () => {
  const quarterbacks = Array.from({ length: 13 }, (_, index) => ({ id: `q${index + 1}`, position: "QB", points: 300 - index * 10, adp: index + 1, yearsExp: 3 }));
  const candidate = { id: "late", position: "QB", points: 170, adp: 100, yearsExp: 2 };
  const ranked = rankPlayers([candidate], { currentPick: 100, replacementPool: quarterbacks });
  assert.ok(ranked[0].vorp < 0);
  assert.ok(!ranked[0].reasons.includes("strong value over replacement"));
});

test("players with no credible ADP or ECR stay out of the redraft pool", () => {
  const players = buildPlayers({
    projections: [{ player_id: "1", team: "FA", stats: { pts_half_ppr: 100 }, player: { first_name: "Unknown", last_name: "Player", position: "WR", team: "FA" } }]
  });
  assert.deepEqual(players, []);
});

test("third-round reversal gives slot 7 picks 7, 18, 30, and 43", () => {
  assert.deepEqual([7, 18, 30, 43].map(pick => pickSlot(pick, 12, 3)), [7, 7, 7, 7]);
  assert.equal(nextPickForSlot(0, 7, 15, 12, 3), 7);
  assert.equal(nextPickForSlot(7, 7, 15, 12, 3), 18);
  assert.equal(nextPickForSlot(18, 7, 15, 12, 3), 30);
});

test("availability falls for later picks", () => {
  const player = { adp: 20, adpSd: 4 };
  assert.ok(availabilityAt(player, 15) > availabilityAt(player, 25));
});

test("an injured duplicate quarterback loses to an open-position starter", () => {
  const qb = { id: "q2", name: "Risky QB", position: "QB", points: 330, adp: 40, yearsExp: 5, injuryStatus: "Out" };
  const wr = { id: "w1", name: "Healthy WR", position: "WR", points: 230, adp: 40, yearsExp: 3 };
  const ranked = rankPlayers([qb, wr], { roster: [{ position: "QB", bye: 7 }], currentPick: 40, nextPick: 55 });
  assert.equal(ranked[0].id, "w1");
});

test("simulation removes predicted intervening picks", () => {
  const players = [1, 2, 3].map(id => ({ id: String(id), name: `P${id}`, position: "RB", points: 300 - id, adp: id, yearsExp: 2 }));
  const draft = { settings: { teams: 2, rounds: 3, reversal_round: 3 }, draft_order: { me: 2, other: 1 } };
  const result = simulateToUserPick(players, { picks: [], draft, userId: "me", histories: [] });
  assert.equal(result.targetPick, 2);
  assert.equal(result.predictions.length, 1);
  assert.equal(result.projectedAvailable.length, 2);
});

test("older draft habits are discounted", async () => {
  const { historicalPositionRates } = await import("../public/ranking.js");
  const rates = historicalPositionRates([
    [{ picked_by: "u", round: 1, position: "WR" }],
    [{ picked_by: "u", round: 1, position: "WR" }],
    Array.from({ length: 5 }, () => ({ picked_by: "u", round: 1, position: "RB" }))
  ]).get("u-1");
  assert.equal(rates.WR, 2);
  assert.equal(rates.RB, 1);
});

test("consensus value beats a veteran RB projection edge", () => {
  const receiver = { id: "wr", name: "Elite WR", position: "WR", points: 245, adp: 6, ecr: 7, yearsExp: 4, receptions: 100 };
  const veteran = { id: "rb", name: "Veteran RB", position: "RB", points: 250, adp: 11, ecr: 12, yearsExp: 9, receptions: 25 };
  assert.equal(rankPlayers([receiver, veteran], { currentPick: 7, nextPick: 18 })[0].id, "wr");
});

test("confidence compares ADP with an overall projection rank, not a remaining-player rank", () => {
  const player = { id: "wr", name: "Aligned WR", position: "WR", points: 240, adp: 50, yearsExp: 3 };
  const lower = { id: "wr2", name: "Lower WR", position: "WR", points: 200, adp: 70, yearsExp: 3 };
  const ranked = rankPlayers([player, lower], { currentPick: 43, nextPick: 54 });
  assert.equal(ranked[0].confidence, "medium");
  assert.ok(!ranked[0].risks.some(risk => risk.includes("ranking sources")));
});

test("a missing RB2 beats a close bench WR after both flex spots are filled", () => {
  const roster = [{ position: "QB" }, { position: "RB" }, { position: "TE" }, ...Array.from({ length: 5 }, () => ({ position: "WR" }))];
  const receiver = { id: "wr", name: "Bench WR", position: "WR", points: 205, adp: 98, yearsExp: 3 };
  const runningBack = { id: "rb", name: "Starting RB", position: "RB", points: 200, adp: 103, yearsExp: 3 };
  assert.equal(rankPlayers([receiver, runningBack], { roster, currentPick: 102, nextPick: 115 })[0].id, "rb");
});

test("an open RB2 beats a close fifth starting WR", () => {
  const roster = [{ position: "QB" }, { position: "RB" }, { position: "TE" }, ...Array.from({ length: 4 }, () => ({ position: "WR" }))];
  const receiver = { id: "wr", name: "Flex WR", position: "WR", points: 205, adp: 98, yearsExp: 3 };
  const runningBack = { id: "rb", name: "Starting RB", position: "RB", points: 200, adp: 103, yearsExp: 3 };
  assert.equal(rankPlayers([receiver, runningBack], { roster, currentPick: 67, nextPick: 78 })[0].id, "rb");
});

test("round ten starts filling RB depth before another bench WR", () => {
  const roster = [{ position: "QB" }, { position: "TE" }, ...Array.from({ length: 2 }, () => ({ position: "RB" })), ...Array.from({ length: 5 }, () => ({ position: "WR" }))];
  const receiver = { id: "wr", name: "Bench WR", position: "WR", points: 205, adp: 110, yearsExp: 3 };
  const runningBack = { id: "rb", name: "Depth RB", position: "RB", points: 200, adp: 115, yearsExp: 3 };
  assert.equal(rankPlayers([receiver, runningBack], { roster, currentPick: 115, nextPick: 126 })[0].id, "rb");
});

test("missing WR starters beat a fifth running back despite a modest ADP edge", () => {
  const roster = [...Array.from({ length: 4 }, () => ({ position: "RB" })), { position: "WR" }, { position: "TE" }];
  const benchRb = { id: "rb", position: "RB", points: 220, adp: 60, yearsExp: 3 };
  const startingWr = { id: "wr", position: "WR", points: 200, adp: 75, yearsExp: 3 };
  assert.equal(rankPlayers([benchRb, startingWr], { roster, currentPick: 78, nextPick: 91 })[0].id, "wr");
});

test("the bye penalty grows when a fifth player shares a bye", () => {
  const candidate = { id: "rb", name: "Same-bye RB", position: "RB", points: 200, adp: 100, yearsExp: 3, bye: 11 };
  const fourth = rankPlayers([candidate], { roster: [...Array.from({ length: 3 }, () => ({ position: "WR", bye: 11 })), { position: "WR", bye: 9 }], currentPick: 100 })[0];
  const fifth = rankPlayers([candidate], { roster: Array.from({ length: 4 }, () => ({ position: "WR", bye: 11 })), currentPick: 100 })[0];
  assert.ok(fourth.score - fifth.score >= 6);
});

test("alternatives include another position", () => {
  const ranked = [
    { id: "1", position: "RB" }, { id: "2", position: "RB" },
    { id: "3", position: "WR" }, { id: "4", position: "TE" }
  ];
  assert.deepEqual(selectRecommendations(ranked).map(player => player.id), ["1", "3", "2"]);
});

test("final roster slots must fill missing starter positions", () => {
  const roster = [
    ...Array.from({ length: 7 }, (_, id) => ({ id: `r${id}`, position: "RB" })),
    ...Array.from({ length: 6 }, (_, id) => ({ id: `w${id}`, position: "WR" }))
  ];
  const qb = { id: "qb", position: "QB", points: 250, adp: 180, yearsExp: 4 };
  const te = { id: "te", position: "TE", points: 150, adp: 170, yearsExp: 4 };
  const rb = { id: "rb", position: "RB", points: 210, adp: 100, yearsExp: 2 };
  const ranked = rankPlayers([qb, te, rb], { roster, currentPick: 170 });
  assert.deepEqual(new Set(ranked.slice(0, 2).map(player => player.position)), new Set(["QB", "TE"]));
});

test("the final pick takes RB4 instead of a backup tight end", () => {
  const roster = [
    ...Array.from({ length: 2 }, () => ({ position: "QB" })),
    ...Array.from({ length: 3 }, () => ({ position: "RB" })),
    ...Array.from({ length: 8 }, () => ({ position: "WR" })),
    { position: "TE" }
  ];
  const rb = { id: "rb", position: "RB", points: 57.7, adp: 212.6, yearsExp: 2 };
  const te = { id: "te", position: "TE", points: 144.1, adp: 194.3, yearsExp: 4, receptions: 61 };
  assert.equal(rankPlayers([te, rb], { roster, currentPick: 174 })[0].id, "rb");
});

test("late starter urgency beats another bench running back", () => {
  const roster = [
    ...Array.from({ length: 4 }, (_, id) => ({ id: `r${id}`, position: "RB" })),
    ...Array.from({ length: 4 }, (_, id) => ({ id: `w${id}`, position: "WR" }))
  ];
  const qb = { id: "qb", position: "QB", points: 285, adp: 95, yearsExp: 4 };
  const te = { id: "te", position: "TE", points: 170, adp: 100, yearsExp: 3 };
  const rb = { id: "rb", position: "RB", points: 205, adp: 80, yearsExp: 2 };
  assert.notEqual(rankPlayers([qb, te, rb], { roster, currentPick: 102 })[0].position, "RB");
});
