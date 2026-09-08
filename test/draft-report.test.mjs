import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, letter, lineup, roleScore, projectedPoints, loadReport } from "../draft-report.mjs";
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
  for (const position of ["QB", "RB", "WR", "TE"]) for (let i = 0; i < 24; i++) snapshot.projections.push({ player_id: `${position}-free-${i}`, player: { first_name: "Free", last_name: position, position }, stats: position === "QB" ? { pass_yd: 4000 } : { rec_yd: 600, rec: 40 } });
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
    assert.equal(team.overall, "A+");
    assert.equal(team.starters, "A+");
    assert.equal(team.depth, "C-");
    assert.equal(team.roster.length, 15);
    assert.equal(team.categories.length, 4);
    assert.equal(team.categories.find(c => c.position === "QB").depth, "F");
    assert.ok(team.categories.find(c => c.position === "TE").depth);
    assert.equal(Object.hasOwn(team, "sortScore"), false);
  }
  assert.deepEqual(buildReport(snapshot), report);
  snapshot.projections.shift();
  const incomplete = buildReport(snapshot);
  assert.ok(incomplete.warning);
  assert.ok(incomplete.teams.every(team => team.overall === null));
  assert.ok(incomplete.teams.every(team => team.starters === null && team.depth === null));
  assert.equal(incomplete.teams.flatMap(team => team.missing).length, 1);
  snapshot.picks.pop();
  assert.throws(() => buildReport(snapshot), /180/);
});

test("role calibration uses production ratios, caps excess, and penalizes empty roles", () => {
  for (const [ratio, grade] of [[1, "A+"], [.95, "A"], [.9, "A-"], [.85, "B"], [.75, "C"], [.65, "D"], [.5, "F"]]) {
    assert.equal(letter(roleScore([{ points: 200 * ratio }], [200])), grade);
  }
  assert.equal(roleScore([{ points: 1000 }], [200, 150]), 50, "One star cannot erase an empty second slot");
  assert.equal(roleScore([], [200]), 0);
  assert.ok(Math.abs(roleScore([{ points: 100 }], [100, 80], [2, 1]) - 200 / 3) < 1e-10);
  assert.equal(letter(93), "A");
  assert.equal(letter(92.999), "A-");
  assert.equal(letter(75), "C");
  assert.equal(letter(59), "F");
  assert.equal(letter(null), null);
});

test("roster stress cases distinguish elite starters, empty benches, and weaker production", () => {
  const baseline = fixture();
  const original = buildReport(baseline);
  const target = report => report.teams.find(team => team.owner === "owner-1");
  const startingIds = new Set(target(original).roster.filter(player => player.slot !== "Bench").map(player => player.id));
  const shallow = structuredClone(baseline);
  for (const record of shallow.projections.filter(record => record.player_id.startsWith("1-") && !startingIds.has(record.player_id))) record.stats = { rec: 0 };
  const shallowReport = buildReport(shallow);
  assert.equal(target(original).overall, "A+");
  assert.equal(target(shallowReport).overall, "A-", "Empty depth loses a real part of the overall score");
  assert.deepEqual(target(shallowReport).categories.map(c => c.starters), target(original).categories.map(c => c.starters));
  assert.ok(target(shallowReport).categories.every(c => c.depth === "F"));
  for (const other of original.teams.filter(team => team.owner !== "owner-1")) {
    assert.deepEqual(shallowReport.teams.find(team => team.owner === other.owner), other, "Changing a roster below reference ranks cannot curve other teams");
  }
  const weaker = structuredClone(baseline);
  for (const record of weaker.projections.filter(record => record.player_id.startsWith("1-"))) {
    record.stats = Object.fromEntries(Object.entries(record.stats).map(([key, value]) => [key, value * .75]));
  }
  assert.match(target(buildReport(weaker)).overall, /^C/);
  const richerWaivers = structuredClone(baseline);
  for (const record of richerWaivers.projections.filter(record => record.player_id.includes("-free-"))) record.stats = { rec_yd: 1500 };
  assert.equal(target(buildReport(richerWaivers)).categories.find(c => c.position === "QB").depth, "F", "Available players cannot become owned depth");
});

test("known weak and incomplete rosters earn poor grades; team identity cannot affect grades", () => {
  const snapshot = fixture();
  for (const record of snapshot.projections.filter(record => record.player_id.startsWith("1-"))) {
    record.stats = { rec_yd: 1, rec: 0 };
  }
  let report = buildReport(snapshot);
  assert.equal(report.teams.find(team => team.owner === "owner-1").overall, "F");
  assert.ok(report.teams.filter(team => team.owner !== "owner-1").every(team => team.overall !== "F"));
  snapshot.users = [{ user_id: "owner-1", metadata: { team_name: "My favorite team" } }];
  assert.equal(buildReport(snapshot).teams.find(team => team.owner === "owner-1").overall, "F");
  for (const record of snapshot.projections.filter(record => record.player_id.startsWith("1-"))) record.player.position = "QB";
  report = buildReport(snapshot);
  assert.equal(report.warning, null, "Known roster deficiencies are not missing source data");
  const broken = report.teams.find(team => team.owner === "owner-1");
  assert.equal(broken.overall, "F");
  assert.equal(broken.categories.find(category => category.position === "TE").starters, "F");
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
    assert.ok(team.overall, "FLEX improvement retains a valid overall grade without requiring a letter boundary crossing");
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
    const document = { querySelectorAll() { return []; }, querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, { hidden: true, addEventListener() {} }); return nodes.get(selector); } };
    await runInNewContext(script, { document, fetch, location: { hash: "" }, window: { addEventListener() {} } });
    return nodes;
  };
  const nodes = await render(async () => ({ ok: true, json: async () => report }));
  assert.equal(nodes.get("#report").hidden, false);
  assert.equal((nodes.get("#teams").innerHTML.match(/<tr>/g) || []).length, 12);
  assert.equal((nodes.get("#teams").innerHTML.match(/<td/g) || []).length, 12, "League overview has only one grade per team");
  assert.equal((nodes.get("#details").innerHTML.match(/team-grades/g) || []).length, 12);
  assert.ok(html.includes("not historical playoff outcomes"));
  assert.equal((nodes.get("#team-choice").innerHTML.match(/<option/g) || []).length, 12);
  assert.ok(nodes.get("#teams").innerHTML.includes("&lt;img"));
  assert.ok(!nodes.get("#teams").innerHTML.includes("<img"));
  assert.ok(nodes.get("#snapshot").textContent.includes("not a draft-day evaluation"));
  assert.ok(!nodes.get("#details").innerHTML.includes("75"));
  const failed = await render(async () => { throw new Error("Source unavailable"); });
  assert.equal(failed.get("#status").textContent, "Source unavailable");
  assert.equal(failed.get("#retry").hidden, false);
});
