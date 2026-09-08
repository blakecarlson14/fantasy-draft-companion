import { createServer } from "node:http";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, "public");
const cacheDir = join(root, ".cache");
const logDir = join(root, "draft-logs");
const port = Number(process.env.PORT || 4173);
const season = "2026";
const leagueId = "1384626278153322496";
const leagueDraftId = "1384626278170103808";
const userId = "576471855602528256";
const historyDraftIds = [
  "1247737383235883008", "1048662472854523905", "992182468344115201",
  "842896145247207425", "720359591103229953", "576472013763489792"
];
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };

let fantasyProsKey = process.env.FANTASYPROS_API_KEY || "";
let fantasyProsUsage = { date: localDate(), calls: 0 };
let usageSave = Promise.resolve();
const loggedPicks = new Map();

await Promise.all([mkdir(cacheDir, { recursive: true }), mkdir(logDir, { recursive: true })]);
try {
  fantasyProsUsage = JSON.parse(await readFile(join(cacheDir, "fantasypros-usage.json"), "utf8"));
  if (fantasyProsUsage.date !== localDate()) fantasyProsUsage = { date: localDate(), calls: 0 };
} catch {}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

async function saveJson(path, value) {
  const temp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(temp, JSON.stringify(value));
  await rename(temp, path);
}

async function logDraftPicks(draftId, picks) {
  if (!Array.isArray(picks)) return;
  const signature = picks.map(pick => `${pick.pick_no}:${pick.player_id}`).join(",");
  if (loggedPicks.get(draftId) === signature) return;
  loggedPicks.set(draftId, signature);
  await saveJson(join(logDir, `${draftId}-picks.json`), { draftId, savedAt: new Date().toISOString(), picks });
}

function loggedPlayer(player = {}) {
  const number = value => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
  return {
    id: String(player.id || "").slice(0, 30), name: String(player.name || "").slice(0, 100),
    position: String(player.position || "").slice(0, 5), team: String(player.team || "").slice(0, 5),
    score: number(player.score), points: number(player.points), vorp: number(player.vorp), baseRank: number(player.baseRank), valueVsPick: number(player.valueVsPick), adp: number(player.adp), adpSource: String(player.adpSource || "").slice(0, 20),
    secondaryAdp: number(player.secondaryAdp), ecr: number(player.ecr),
    confidence: String(player.confidence || "").slice(0, 20),
    reasons: Array.isArray(player.reasons) ? player.reasons.slice(0, 10).map(value => String(value).slice(0, 200)) : [],
    risks: Array.isArray(player.risks) ? player.risks.slice(0, 10).map(value => String(value).slice(0, 200)) : []
  };
}

async function cached(name, ttl, loader) {
  const path = join(cacheDir, `${name}.json`);
  let previous;
  try { previous = JSON.parse(await readFile(path, "utf8")); } catch {}
  if (previous && Date.now() - previous.fetchedAt < ttl) return { ...previous, stale: false };
  try {
    const record = { fetchedAt: Date.now(), data: await loader() };
    await saveJson(path, record);
    return { ...record, stale: false };
  } catch (error) {
    if (previous) return { ...previous, stale: true, error: error.message };
    return { fetchedAt: null, data: null, stale: true, error: error.message };
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 180);
    throw new Error(`${response.status} ${response.statusText} from ${new URL(url).hostname}${detail ? `: ${detail}` : ""}`);
  }
  return response.json();
}

const sleeper = (path, ttl = 10 * 60_000, transform) => cached(`sleeper-${path.replaceAll("/", "-")}`, ttl, async () => {
  const data = await fetchJson(`https://api.sleeper.app/v1/${path}`);
  return transform ? transform(data) : data;
});

const sleeperUndocumented = (name, url, ttl, transform) => cached(name, ttl, async () => {
  const data = await fetchJson(url);
  return transform ? transform(data) : data;
});

async function fantasyPros(name, path, ttl) {
  if (!fantasyProsKey) return { fetchedAt: null, data: null, stale: true, error: "API key not configured" };
  return cached(`fantasypros-${name}`, ttl, async () => {
    if (fantasyProsUsage.date !== localDate()) fantasyProsUsage = { date: localDate(), calls: 0 };
    if (fantasyProsUsage.calls >= 48) throw new Error("FantasyPros safety limit reached (48 of 50 calls)");
    fantasyProsUsage.calls += 1;
    const usageSnapshot = { ...fantasyProsUsage };
    usageSave = usageSave.then(() => saveJson(join(cacheDir, "fantasypros-usage.json"), usageSnapshot));
    await usageSave;
    return fetchJson(`https://api.fantasypros.com/public/v2/json/${path}`, { headers: { "x-api-key": fantasyProsKey } });
  });
}

function trimProjections(records) {
  return records.filter(({ player, stats }) => {
    const position = player?.position;
    return ["QB", "RB", "WR", "TE", "DEF", "DST"].includes(position) &&
      (Number.isFinite(stats?.pts_half_ppr) || Number(stats?.adp_half_ppr) < 400);
  });
}

function trimHistory(records) {
  return records.map(pick => ({
    picked_by: pick.picked_by,
    player_id: pick.player_id,
    round: pick.round,
    draft_slot: pick.draft_slot,
    pick_no: pick.pick_no,
    position: pick.metadata?.position
  }));
}

async function bootstrap(draftId = leagueDraftId) {
  const [league, draft, rosters, users, picks, projections, adp, schedule, fpRankings, fpProjections, fpNews, history] = await Promise.all([
    sleeper(`league/${leagueId}`, 60_000),
    sleeper(`draft/${draftId}`, 5_000),
    sleeper(`league/${leagueId}/rosters`, 5_000),
    sleeper(`league/${leagueId}/users`, 60_000),
    sleeper(`draft/${draftId}/picks`, 2_000),
    sleeperUndocumented("sleeper-projections", `https://api.sleeper.com/projections/nfl/${season}?season_type=regular`, 5 * 60_000, trimProjections),
    cached("ffc-adp", 6 * 60 * 60_000, () => fetchJson(`https://fantasyfootballcalculator.com/api/v1/adp/half-ppr?teams=12&year=${season}`)),
    sleeperUndocumented("sleeper-schedule", `https://api.sleeper.app/schedule/nfl/regular/${season}`, 6 * 60 * 60_000),
    fantasyPros("rankings", `nfl/${season}/consensus-rankings?position=FLX&scoring=HALF`, 6 * 60 * 60_000),
    fantasyPros("projections", `nfl/${season}/projections?week=0&position=QB&scoring=HALF`, 6 * 60 * 60_000),
    fantasyPros("news", "nfl/news?limit=100", 60 * 60_000),
    Promise.all(historyDraftIds.map(id => sleeper(`draft/${id}/picks`, 24 * 60 * 60_000, trimHistory)))
  ]);
  await logDraftPicks(draftId, picks.data);
  return {
    config: { leagueId, draftId, leagueDraftId, userId, season, fantasyProsConfigured: Boolean(fantasyProsKey), fantasyProsUsage },
    league, draft, rosters, users, picks, projections, adp, schedule,
    history,
    fantasyPros: { rankings: fpRankings, projections: fpProjections, news: fpNews }
  };
}

async function draftState(draftId = leagueDraftId) {
  const [draft, picks] = await Promise.all([
    sleeper(`draft/${draftId}`, 2_000),
    sleeper(`draft/${draftId}/picks`, 250)
  ]);
  await logDraftPicks(draftId, picks.data);
  return { draft, picks };
}

async function playerNews(ids) {
  const sleeperNews = await Promise.all(ids.slice(0, 3).map(id =>
    sleeperUndocumented(`news-${id}`, `https://api.sleeper.com/players/nfl/${id}/news?limit=5`, 60_000)
  ));
  const fpNews = await fantasyPros("news", "nfl/news?limit=100", 60 * 60_000);
  return { sleeper: sleeperNews, fantasyPros: fpNews, fantasyProsUsage };
}

function sendJson(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

async function readBody(request, limit = 1_000) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > limit) throw new Error("Request too large");
  }
  return JSON.parse(body || "{}");
}

async function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const path = normalize(join(publicDir, requested));
  if (path !== publicDir && !path.startsWith(`${publicDir}/`)) return sendJson(response, 404, { error: "Not found" });
  try {
    const file = await readFile(path);
    response.writeHead(200, { "content-type": mime[extname(path)] || "application/octet-stream" });
    response.end(file);
  } catch {
    sendJson(response, 404, { error: "Not found" });
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const requestedDraftId = url.searchParams.get("draft_id");
    if (requestedDraftId && !/^\d{15,20}$/.test(requestedDraftId)) return sendJson(response, 400, { error: "Invalid Sleeper draft ID" });
    const activeDraftId = requestedDraftId || leagueDraftId;
    if (request.method === "GET" && url.pathname === "/api/bootstrap") return sendJson(response, 200, await bootstrap(activeDraftId));
    if (request.method === "GET" && url.pathname === "/api/draft-state") return sendJson(response, 200, await draftState(activeDraftId));
    if (request.method === "GET" && url.pathname === "/api/news") {
      const ids = (url.searchParams.get("player_ids") || "").split(",").filter(id => /^\d+$/.test(id));
      return sendJson(response, 200, await playerNews(ids));
    }
    if (request.method === "POST" && url.pathname === "/api/fantasypros-key") {
      const { key } = await readBody(request);
      if (typeof key !== "string" || key.trim().length < 10 || key.length > 300) return sendJson(response, 400, { error: "Invalid API key" });
      fantasyProsKey = key.trim();
      return sendJson(response, 200, { ok: true });
    }
    if (request.method === "POST" && url.pathname === "/api/decision-log") {
      const body = await readBody(request, 20_000);
      const pickNo = Number(body.pickNo);
      if (!Number.isInteger(pickNo) || pickNo < 1 || pickNo > 300 || !Array.isArray(body.recommendations) || !Array.isArray(body.roster)) return sendJson(response, 400, { error: "Invalid decision log" });
      const record = {
        draftId: activeDraftId, pickNo, savedAt: new Date().toISOString(),
        recommendations: body.recommendations.slice(0, 3).map(loggedPlayer),
        roster: body.roster.slice(0, 30).map(loggedPlayer)
      };
      await saveJson(join(logDir, `${activeDraftId}-pick-${pickNo}.json`), record);
      await appendFile(join(logDir, `${activeDraftId}-decisions.ndjson`), `${JSON.stringify(record)}\n`);
      return sendJson(response, 200, { ok: true });
    }
    if (request.method === "GET") return serveStatic(url.pathname, response);
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Draft Night is running at http://127.0.0.1:${port}`);
});
