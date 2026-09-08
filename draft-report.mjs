import { readFile, writeFile, link, unlink } from "node:fs/promises";
import { join } from "node:path";

const positions = ["QB", "RB", "WR", "TE"];
const slots = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "FLEX"];
const scoringKeys = ["pass_yd", "pass_td", "pass_int", "pass_2pt", "rush_yd", "rush_td", "rush_2pt", "rec", "rec_yd", "rec_td", "rec_2pt", "fum", "fum_lost", "fum_rec_td"];
const sum = values => values.reduce((a, b) => a + b, 0);

export function letter(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return [[97, "A+"], [93, "A"], [90, "A-"], [87, "B+"], [83, "B"], [80, "B-"], [77, "C+"], [73, "C"], [70, "C-"], [67, "D+"], [63, "D"], [60, "D-"]].find(([min]) => value >= min)?.[1] || "F";
}

export function roleScore(players, references, weights = references.map(() => 1)) {
  return sum(references.map((reference, index) => Math.max(0, Math.min(1, (players[index]?.points || 0) / reference)) * weights[index])) / sum(weights) * 100;
}

export function projectedPoints(record, scoring) {
  const stats = record.stats;
  if (!stats || !scoringKeys.some(key => Number.isFinite(stats[key]))) return null;
  return sum(scoringKeys.map(key => (stats[key] || 0) * (scoring[key] || 0))) +
    (record.player?.position === "TE" ? (stats.rec || 0) * (scoring.bonus_rec_te || 0) : 0);
}

export function lineup(players) {
  const remaining = players.filter(player => Number.isFinite(player.points)).sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  return slots.map(slot => {
    const index = remaining.findIndex(player => slot === "FLEX" ? ["RB", "WR", "TE"].includes(player.position) : player.position === slot);
    return index < 0 ? null : { ...remaining.splice(index, 1)[0], slot };
  });
}

export function buildReport(snapshot) {
  const { picks, draft, league, users, projections } = snapshot;
  if (draft.status !== "complete" || picks.length !== 180 || new Set(picks.map(p => String(p.player_id))).size !== 180 || new Set(picks.map(p => p.pick_no)).size !== 180 || picks.some(p => !Number.isInteger(p.pick_no) || p.pick_no < 1 || p.pick_no > 180) || Object.keys(draft.draft_order).length !== 12) throw new Error("The report requires all 180 unique completed draft picks.");
  if (JSON.stringify(league.roster_positions) !== JSON.stringify([...slots, ...Array(6).fill("BN")])) throw new Error("League lineup settings differ from the supported Minnesota Madness draft.");
  const players = projections.filter(record => positions.includes(record.player?.position)).map(record => ({
    id: String(record.player_id), name: `${record.player.first_name} ${record.player.last_name}`, position: record.player.position,
    points: projectedPoints(record, league.scoring_settings), injury: record.player.injury_status || null,
    injuryNotes: record.player.injury_notes || null,
  }));
  const byId = new Map(players.map(player => [player.id, player]));
  // Footballguys' documented By Pos reference roles inspire this, not its unpublished letter formula.
  const pool = players.filter(player => Number.isFinite(player.points)).sort((a, b) => b.points - a.points);
  const selected = new Set();
  const benchmarks = Object.fromEntries(positions.map(position => {
    const group = pool.filter(player => player.position === position).slice(0, slots.filter(slot => slot === position).length * 12);
    group.forEach(player => selected.add(player.id));
    return [position, Array.from({ length: slots.filter(slot => slot === position).length }, (_, index) => group[index * 12]?.points)];
  }));
  const flexPool = pool.filter(player => player.position !== "QB" && !selected.has(player.id)).slice(0, 24);
  const flexBenchmark = [flexPool[0]?.points, flexPool[12]?.points];
  flexPool.forEach(player => selected.add(player.id));
  const depthBenchmarks = Object.fromEntries(positions.map(position => {
    const reserves = pool.filter(player => player.position === position && !selected.has(player.id));
    return [position, [reserves[0]?.points, ...(["RB", "WR"].includes(position) ? [reserves[12]?.points] : [])]];
  }));
  if ([...Object.values(benchmarks).flat(), ...flexBenchmark, ...Object.values(depthBenchmarks).flat()].some(value => !Number.isFinite(value) || value <= 0)) throw new Error("Insufficient positional benchmark data.");
  const teams = Object.entries(draft.draft_order).map(([owner, slot]) => {
    const user = users.find(user => user.user_id === owner);
    const roster = picks.filter(pick => pick.draft_slot === slot).sort((a, b) => a.pick_no - b.pick_no).map(pick => byId.get(String(pick.player_id)) || {
      id: String(pick.player_id), name: `${pick.metadata?.first_name || ""} ${pick.metadata?.last_name || ""}`.trim() || String(pick.player_id), position: pick.metadata?.position, points: null,
    });
    if (roster.length !== 15) throw new Error(`Expected 15 picks for draft slot ${slot}.`);
    const starters = lineup(roster);
    const starterIds = new Set(starters.filter(Boolean).map(player => player.id));
    const bench = roster.filter(player => !starterIds.has(player.id));
    const missing = roster.filter(player => !Number.isFinite(player.points));
    return { owner, name: user?.metadata?.team_name || user?.display_name || `Draft slot ${slot}`, roster, starters, bench, missing };
  });
  const complete = teams.every(team => !team.missing.length);
  const positionScores = Object.fromEntries(positions.map(position => [position, {
    starters: teams.map(team => roleScore(team.starters.filter(player => player?.slot === position), benchmarks[position])),
    // ponytail: two reserve roles for RB/WR, one for QB/TE; weekly availability would require separate projections.
    depth: teams.map(team => roleScore(team.bench.filter(player => player.position === position).sort((a, b) => b.points - a.points), depthBenchmarks[position], depthBenchmarks[position].map((_, index) => index === 0 ? 2 : 1))),
  }]));
  const results = teams.map((team, index) => {
    const starterScore = (sum(positions.map(position => positionScores[position].starters[index] * benchmarks[position].length)) + 2 * roleScore(team.starters.filter(player => player?.slot === "FLEX"), flexBenchmark)) / 9;
    const depthScore = sum(positions.map(position => positionScores[position].depth[index] * benchmarks[position].length)) / 7;
    const overallScore = 0.9 * starterScore + 0.1 * depthScore;
    const categories = positions.map(position => {
      const starters = team.starters.filter(player => player?.position === position);
      const bench = team.bench.filter(player => player.position === position);
      const depth = positionScores[position].depth[index];
      const names = starters.filter(player => player.slot === position).map(player => player.name).join(", ");
      const referenceNames = benchmarks[position].map((_, index) => pool.filter(player => player.position === position)[index * 12].name).join(", ");
      const flex = starters.filter(player => player.slot === "FLEX").map(player => player.name);
      return { position, starters: complete ? letter(positionScores[position].starters[index]) : null, depth: complete ? letter(depth) : null,
        explanation: `Starter grade: ${names || "No starter"}. Reference players: ${referenceNames}. ${flex.length ? `${flex.join(", ")} contributes at FLEX to the overall grade, not this fixed-slot starter grade or bench depth. ` : ""}${bench.length ? `Reserve options: ${bench.map(player => player.name).join(", ")}.` : "No drafted reserve at this position. The depth F means no owned cover, not a bad draft decision."} Depth compares drafted reserves with positional reserve roles. Waiver pickups are not credited.`,
      };
    });
    const ordered = [...positions].sort((a, b) => positionScores[b].starters[index] - positionScores[a].starters[index]);
    const weakestDepth = [...positions].sort((a, b) => positionScores[a].depth[index] - positionScores[b].depth[index])[0];
    const risks = team.roster.filter(player => player.injury).map(player => `${player.name}: ${player.injury}${player.injuryNotes ? `. ${player.injuryNotes}` : ""}`);
    const publicPlayer = player => ({ id: player.id, name: player.name, position: player.position, slot: player.slot || "Bench" });
    return { name: team.name, owner: team.owner, overall: complete ? letter(overallScore) : null, categories,
      summary: complete ? `${ordered[0]} is the strongest fixed-position group against the positional reference roles; ${ordered.at(-1)} is the weakest. ${weakestDepth} has the thinnest drafted depth. Overall emphasizes the full starting lineup, including FLEX, with a smaller contribution from owned reserves.` : "League comparison is unavailable until every drafted roster has sufficient projection data.",
      strength: complete ? ordered[0] : null, weakness: complete ? ordered.at(-1) : null,
      risks: risks.length ? risks : ["No injury designation in this snapshot. That does not establish that the roster is risk-free."],
      uncertainty: "Season projections do not measure player ceilings or championship probabilities. No separate upside bonus is assumed.",
      missing: team.missing.map(player => player.name), roster: [...team.starters.filter(Boolean), ...team.bench].map(publicPlayer),
      sortScore: complete ? overallScore : 0,
    };
  }).sort((a, b) => b.sortScore - a.sortScore || a.name.localeCompare(b.name));
  return { evaluatedAt: snapshot.evaluatedAt, draftEndedAt: new Date(draft.last_picked).toISOString(), mode: snapshot.mode, source: snapshot.source,
    warning: complete ? null : "Insufficient projection data. Grades are withheld league-wide to avoid comparing complete and incomplete rosters.",
    teams: results.map(({ sortScore, ...team }) => team) };
}

export async function loadReport(root, fetchJson) {
  const path = join(root, "draft-logs", "grading-snapshot-2026.json");
  try { return buildReport(JSON.parse(await readFile(path, "utf8"))); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const readCache = async (name, endpoint) => {
    try { return JSON.parse(await readFile(join(root, ".cache", `${name}.json`), "utf8")).data; }
    catch (error) { if (error.code !== "ENOENT") throw error; return fetchJson(`https://api.sleeper.app/v1/${endpoint}`); }
  };
  const [pickLog, draft, league, users, projections] = await Promise.all([
    readFile(join(root, "draft-logs", "1384626278170103808-picks.json"), "utf8").then(JSON.parse).catch(async error => {
      if (error.code !== "ENOENT") throw error;
      return { picks: await fetchJson("https://api.sleeper.app/v1/draft/1384626278170103808/picks") };
    }),
    readCache("sleeper-draft-1384626278170103808", "draft/1384626278170103808"), readCache("sleeper-league-1384626278153322496", "league/1384626278153322496"),
    readCache("sleeper-league-1384626278153322496-users", "league/1384626278153322496/users"),
    fetchJson("https://api.sleeper.com/projections/nfl/2026?season_type=regular"),
  ]);
  if (!Array.isArray(projections) || !projections.length || projections.some(record => String(record.season) !== "2026" || record.season_type !== "regular" || record.week != null)) throw new Error("Expected 2026 full-season regular-season projections.");
  const evaluatedAt = new Date().toISOString();
  const snapshot = { version: 1, mode: "current-fallback", evaluatedAt, source: { name: "Sleeper season projections", fetchedAt: evaluatedAt, horizon: "2026 regular season", url: "https://api.sleeper.com/projections/nfl/2026?season_type=regular" }, picks: pickLog.picks, draft, league, users, projections };
  const report = buildReport(snapshot);
  if (report.warning) return report; // Do not permanently freeze an incomplete source response.
  const temporary = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot), { flag: "wx" });
  try { await link(temporary, path); }
  catch (error) { if (error.code !== "EEXIST") throw error; return buildReport(JSON.parse(await readFile(path, "utf8"))); }
  finally { await unlink(temporary); }
  return report;
}
