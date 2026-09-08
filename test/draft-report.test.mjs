import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, letter, lineup, normalize, projectedPoints, loadReport } from "../draft-report.mjs";
import { mkdtemp, mkdir, rm, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { tmpdir } from "node:os";
import { join } from "node:path";

function fixture() {
  const rosterPositions = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "FLEX", ...Array(6).fill("BN")];
  const snapshot = { evaluatedAt: "2026-09-08T12:00:00Z", mode: "current-fallback", source: {},
    draft: { status: "complete", last_picked: 1788398341255, draft_order: {} }, league: { roster_positions: rosterPositions, scoring_settings: { pass_yd: 0.04, rush_yd: 0.1, rec_yd: 0.1, rec: 0.5, bonus_rec_te: 0.5 } }, users: [], picks: [], projections: [] };
  for (let slot = 1; slot <= 12; slot++) {
    snapshot.draft.draft_order[`owner-${slot}`] = slot;
    const positions = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "RB", "WR", "RB", "RB", "WR", "WR", "WR", "WR"];
    positions.forEach((position, index) => {
      const id = `${slot}-${index}`;
      snapshot.picks.push({ player_id: id, draft_slot: slot, pick_no: (slot - 1) * 15 + index + 1, metadata: { first_name: id, last_name: "Player", position } });
      snapshot.projections.push({ player_id: id, player: { first_name: id, last_name: "Player", position }, stats: position === "QB" ? { pass_yd: 5000 } : { rec_yd: 1500 - index * 40, rec: 50 } });
    });
  }
  for (const position of ["QB", "RB", "WR", "TE"]) for (let i = 0; i < 3; i++) snapshot.projections.push({ player_id: `${position}-free-${i}`, player: { first_name: "Free", last_name: position, position }, stats: position === "QB" ? { pass_yd: 4000 } : { rec_yd: 600, rec: 40 } });
  return snapshot;
}

test("report scores league rules, assigns FLEX once, and keeps missing projections distinct from zero", () => {
  assert.equal(projectedPoints({ player: { position: "TE" }, stats: { rec: 10, rec_yd: 100 } }, { rec: 0.5, rec_yd: 0.1, bonus_rec_te: 0.5 }), 20);
  assert.equal(projectedPoints({ player: { position: "WR" }, stats: { adp_half_ppr: 10 } }, {}), null);
  assert.equal(projectedPoints({ player: { position: "WR" }, stats: { rec: 0 } }, { rec: 0.5 }), 0);
  const snapshot = fixture();
  const players = snapshot.projections.slice(0, 15).map(record => ({ id: record.player_id, position: record.player.position, points: projectedPoints(record, snapshot.league.scoring_settings) }));
  const selected = lineup(players);
  assert.equal(selected.length, 9);
  assert.equal(new Set(selected.map(p => p.id)).size, 9);
  assert.equal(selected.filter(p => p.slot === "FLEX").length, 2);
  const upgraded = players.map((p, i) => i === 14 ? { ...p, points: 1000 } : p);
  assert.ok(lineup(upgraded).reduce((n, p) => n + p.points, 0) > selected.reduce((n, p) => n + p.points, 0));
  const report = buildReport(snapshot);
  assert.equal(report.teams.length, 12);
  assert.equal(report.warning, null);
  for (const team of report.teams) {
    assert.equal(team.overall, "C");
    assert.equal(team.roster.length, 15);
    assert.equal(team.categories.length, 4);
    assert.equal(team.categories.find(c => c.position === "QB").depth, "C");
    assert.equal(team.categories.find(c => c.position === "TE").depth, "C");
    assert.equal(Object.hasOwn(team, "sortScore"), false);
  }
  assert.deepEqual(buildReport(snapshot), report);
  snapshot.projections.shift();
  const incomplete = buildReport(snapshot);
  assert.ok(incomplete.warning);
  assert.ok(incomplete.teams.every(team => team.overall === null));
  assert.equal(incomplete.teams.flatMap(team => team.missing).length, 1);
  snapshot.picks.pop();
  assert.throws(() => buildReport(snapshot), /180/);
});

test("letter boundaries and an identical league have stable grades", () => {
  assert.deepEqual(normalize([10, 10, 10]), [75, 75, 75]);
  assert.equal(letter(93), "A");
  assert.equal(letter(92.999), "A-");
  assert.equal(letter(75), "C");
  assert.equal(letter(59), "F");
  assert.equal(letter(null), null);
});

test("FLEX allocation cannot inflate or dilute fixed-position starter grades", () => {
  for (const [position, yards] of [["TE", 1600], ["RB", 1540], ["WR", 1540]]) {
    const snapshot = fixture();
    const original = buildReport(snapshot);
    const reserve = snapshot.projections.find(player => player.player_id === "1-14");
    reserve.player.position = position;
    reserve.stats = { rec_yd: yards, rec: 0 };
    const changed = buildReport(snapshot);
    const team = changed.teams.find(team => team.owner === "owner-1");
    assert.equal(team.roster.find(player => player.id === "1-14").slot, "FLEX");
    for (const current of changed.teams) {
      const previous = original.teams.find(team => team.owner === current.owner);
      assert.deepEqual(current.categories.map(c => c.starters), previous.categories.map(c => c.starters), `${position} FLEX must not change anyone's fixed-slot grades`);
    }
    assert.notEqual(team.overall, original.teams.find(team => team.owner === "owner-1").overall, "FLEX improvement still contributes to overall strength");
  }
});

test("a fresh checkout freezes a complete snapshot and reopens it without fetching", async () => {
  const root = await mkdtemp(join(tmpdir(), "draft-report-test-"));
  try {
    await mkdir(join(root, "draft-logs"));
    const snapshot = fixture();
    snapshot.projections = snapshot.projections.map(record => ({ ...record, season: "2026", season_type: "regular", week: null }));
    const fetchJson = async url => url.includes("/projections/") ? snapshot.projections : url.endsWith("/picks") ? snapshot.picks : url.endsWith("/users") ? snapshot.users : url.includes("/draft/") ? snapshot.draft : snapshot.league;
    const report = await loadReport(root, fetchJson);
    assert.equal(report.warning, null);
    assert.equal(report.mode, "current-fallback");
    const frozen = await loadReport(root, () => { throw new Error("Should not refresh a frozen snapshot"); });
    assert.deepEqual(frozen, report);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("report page renders letter grades, escapes external text, and offers retry on failure", async () => {
  const html = await readFile(new URL("../public/report.html", import.meta.url), "utf8");
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const report = buildReport(fixture());
  report.source = { name: "Test projections", fetchedAt: report.evaluatedAt, horizon: "2026" };
  report.teams[0].name = '<img src=x onerror="alert(1)">';
  const render = async fetch => {
    const nodes = new Map();
    const document = { querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, { hidden: true, addEventListener() {} }); return nodes.get(selector); } };
    await runInNewContext(script, { document, fetch });
    return nodes;
  };
  const nodes = await render(async () => ({ ok: true, json: async () => report }));
  assert.equal(nodes.get("#report").hidden, false);
  assert.equal((nodes.get("#teams").innerHTML.match(/<tr>/g) || []).length, 12);
  assert.ok(nodes.get("#teams").innerHTML.includes("&lt;img"));
  assert.ok(!nodes.get("#teams").innerHTML.includes("<img"));
  assert.ok(nodes.get("#snapshot").textContent.includes("not a draft-day evaluation"));
  assert.ok(!nodes.get("#details").innerHTML.includes("75"));
  const failed = await render(async () => { throw new Error("Source unavailable"); });
  assert.equal(failed.get("#status").textContent, "Source unavailable");
  assert.equal(failed.get("#retry").hidden, false);
});
