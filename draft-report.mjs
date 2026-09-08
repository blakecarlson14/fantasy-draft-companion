import { readFile, writeFile, link, unlink } from "node:fs/promises";
import { join } from "node:path";

const positions = ["QB", "RB", "WR", "TE"];
const slots = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "FLEX"];
const scoringKeys = ["pass_yd", "pass_td", "pass_int", "pass_2pt", "rush_yd", "rush_td", "rush_2pt", "rec", "rec_yd", "rec_td", "rec_2pt", "fum", "fum_lost", "fum_rec_td"];
const sum = values => values.reduce((a, b) => a + b, 0);
const mean = values => values.length ? sum(values) / values.length : 0;

export function letter(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return [[97, "A+"], [93, "A"], [90, "A-"], [87, "B+"], [83, "B"], [80, "B-"], [77, "C+"], [73, "C"], [70, "C-"], [67, "D+"], [63, "D"], [60, "D-"]].find(([min]) => value >= min)?.[1] || "F";
}

export function normalize(values) {
  const average = mean(values);
  const deviation = Math.sqrt(mean(values.map(value => (value - average) ** 2)));
  return values.map(value => deviation < 1e-8 ? 75 : Math.max(0, Math.min(100, 75 + 10 * (value - average) / deviation)));
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
  const drafted = new Set(picks.map(pick => String(pick.player_id)));
  // ponytail: median of the top three undrafted projections is a streaming baseline, not a waiver acquisition forecast.
  const replacements = positions.map(position => {
    const pool = players.filter(player => player.position === position && !drafted.has(player.id) && Number.isFinite(player.points)).sort((a, b) => b.points - a.points);
    if (pool.length < 3) throw new Error(`Insufficient ${position} replacement data.`);
    return { id: `replacement-${position}`, name: `Undrafted ${position} baseline`, position, points: pool[1].points };
  });
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
    const coverage = starters.map(starter => {
      if (!starter) return 0;
      const baseline = starters.filter(player => player && player.id !== starter.id);
      const replacement = replacements.find(player => player.position === starter.position);
      const fallback = lineup([...baseline, replacement]);
      const covered = lineup([...baseline, ...bench, replacement]);
      return Math.max(0, sum(covered.filter(Boolean).map(player => player.points)) - sum(fallback.filter(Boolean).map(player => player.points)));
    });
    return { owner, name: user?.metadata?.team_name || user?.display_name || `Draft slot ${slot}`, roster, starters, bench, missing,
      starterValue: sum(starters.filter(Boolean).map(player => player.points)), depthValue: mean(coverage), coverage,
    };
  });
  const complete = teams.every(team => !team.missing.length && team.starters.every(Boolean));
  const starterScores = normalize(teams.map(team => team.starterValue));
  const depthScores = normalize(teams.map(team => team.depthValue));
  const positionScores = Object.fromEntries(positions.map(position => [position, {
    starters: normalize(teams.map(team => sum(team.starters.filter(player => player?.slot === position).map(player => player.points)))),
    depth: normalize(teams.map(team => mean(team.coverage.filter((_, index) => team.starters[index]?.position === position)))),
  }]));
  const results = teams.map((team, index) => {
    const overallScore = 0.8 * starterScores[index] + 0.2 * depthScores[index];
    const categories = positions.map(position => {
      const starters = team.starters.filter(player => player?.position === position);
      const bench = team.bench.filter(player => player.position === position);
      let depth = positionScores[position].depth[index];
      const replacement = replacements.find(player => player.position === position);
      // A readily streamable one-starter position has neutral cover even without a drafted backup.
      const typicalStarter = mean(teams.map(other => Math.max(...other.starters.filter(player => player?.position === position).map(player => player.points), 0)));
      const streamable = ["QB", "TE"].includes(position) && replacement.points >= typicalStarter * 0.65;
      if (streamable) depth = Math.max(75, depth);
      const names = starters.filter(player => player.slot === position).map(player => player.name).join(", ");
      const flex = starters.filter(player => player.slot === "FLEX").map(player => player.name);
      return { position, starters: complete ? letter(positionScores[position].starters[index]) : null, depth: complete ? letter(depth) : null,
        explanation: `Starter grade: ${names || "No starter"}. ${flex.length ? `${flex.join(", ")} contributes at FLEX to the overall grade, not this fixed-slot starter grade or bench depth. ` : ""}${bench.length ? `Reserve options: ${bench.map(player => player.name).join(", ")}.` : "No drafted reserve at this position."} ${streamable ? "The undrafted pool provides a reasonable coverage baseline." : "Coverage is evaluated against the undrafted pool and this league's starting requirements."}`,
      };
    });
    const ordered = [...positions].sort((a, b) => positionScores[b].starters[index] - positionScores[a].starters[index]);
    const risks = team.roster.filter(player => player.injury).map(player => `${player.name}: ${player.injury}${player.injuryNotes ? `. ${player.injuryNotes}` : ""}`);
    const publicPlayer = player => ({ id: player.id, name: player.name, position: player.position, slot: player.slot || "Bench" });
    return { name: team.name, owner: team.owner, overall: complete ? letter(overallScore) : null, categories,
      summary: complete ? `${ordered[0]} is the strongest positional contribution relative to this league; ${ordered.at(-1)} is the weakest. Starting production carries most of the overall grade, with useful bench cover also contributing.` : "League comparison is unavailable until every drafted roster has sufficient projection data.",
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
