import { PROJECTION_WEIGHTS, RANKING_WEIGHTS, availabilityAt, buildPlayers, nextPickForSlot, normalizeName, parseDraftId, rankPlayers, selectRecommendations, simulateToUserPick } from "./ranking.js?v=20260902-9";

const state = { bootstrap: null, players: [], picks: [], ranked: [], predictions: [], targetPick: null, draftIssue: "", excluded: new Set(JSON.parse(localStorage.getItem("excluded") || "[]")), showExcluded: false, newsPlayer: null, loggedDecision: "" };
const $ = selector => document.querySelector(selector);
const fmt = value => Number.isFinite(value) ? value.toFixed(1) : "—";
const pickValue = value => !Number.isFinite(value) ? "—" : Math.abs(value) < 1 ? "Fair value" : `${value > 0 ? "+" : ""}${Math.round(value)} spots`;
const pct = value => value == null ? "—" : `${Math.round(value * 100)}%`;
const age = timestamp => !timestamp ? "unavailable" : `${Math.max(0, Math.round((Date.now() - timestamp) / 60_000))}m ago`;
const data = source => source?.data ?? null;
const pageUrl = new URL(globalThis.location?.href || "http://localhost/");
const mockDraftId = pageUrl.searchParams.get("draft");
const apiUrl = path => mockDraftId ? `${path}?draft_id=${encodeURIComponent(mockDraftId)}` : path;

async function json(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || response.statusText);
  return body;
}

function build() {
  const b = state.bootstrap;
  const sleeper = data(b.projections) || [];
  const ffc = data(b.adp)?.players || [];
  const fpRankings = data(b.fantasyPros.rankings)?.players || [];
  const fpProjections = data(b.fantasyPros.projections)?.players || data(b.fantasyPros.projections)?.player || [];
  state.players = buildPlayers({ projections: sleeper, adp: ffc, fpRankings, fpProjections, schedule: data(b.schedule) || [] });
  state.picks = data(b.picks) || [];
  recalculate();
}

function recalculate() {
  const b = state.bootstrap;
  const draft = data(b.draft);
  const users = data(b.users) || [];
  const userNames = Object.fromEntries(users.map(user => [user.user_id, user.display_name]));
  const picked = new Set(state.picks.map(pick => String(pick.player_id)));
  const available = state.players.filter(player => !picked.has(player.id));
  const mine = state.picks.filter(pick => String(pick.picked_by) === b.config.userId).map(pick => state.players.find(player => player.id === String(pick.player_id))).filter(Boolean);
  const histories = (b.history || []).map(data).filter(Boolean);
  state.draftIssue = Number.isInteger(Number(draft.draft_order?.[b.config.userId])) ? "" : "Claim a slot in this Sleeper draftboard, then refresh this page";
  const simulation = simulateToUserPick(state.players, { picks: state.picks, draft, userId: b.config.userId, histories });
  state.targetPick = simulation.targetPick;
  state.predictions = simulation.predictions.map(prediction => ({ ...prediction, ownerName: userNames[prediction.owner] || `Slot ${prediction.slot}` }));
  const current = state.picks.length + 1;
  const onClock = simulation.targetPick === current;
  const pool = onClock ? available : available.map(player => ({ ...player, turnAvailability: availabilityAt(player, simulation.targetPick) })).filter(player => player.turnAvailability == null || player.turnAvailability >= 0.25);
  const followingPick = simulation.targetPick ? nextPickForSlot(simulation.targetPick, Number(draft.draft_order[b.config.userId]), draft.settings.rounds, draft.settings.teams, draft.settings.reversal_round) : null;
  state.ranked = rankPlayers(pool, { roster: mine, currentPick: simulation.targetPick || current, nextPick: followingPick, excluded: state.excluded, replacementPool: state.players });
  render(mine, current, followingPick);
}

function warningText() {
  const b = state.bootstrap;
  const sources = [b.projections, b.adp, b.schedule, ...(b.config.fantasyProsConfigured ? [b.fantasyPros.rankings, b.fantasyPros.projections] : [])];
  const failures = sources.filter(source => source?.stale || source?.error);
  return [...failures.map(source => source.error).filter(Boolean), state.draftIssue].filter(Boolean).join(" · ");
}

function render(roster, currentPick, followingPick) {
  const b = state.bootstrap;
  const draft = data(b.draft);
  const onClock = state.targetPick === currentPick;
  $("#status").innerHTML = `<span class="pill">${b.config.draftId === b.config.leagueDraftId ? "LEAGUE" : "MOCK"}</span><span class="pill ${draft.status === "drafting" ? "live" : ""}">${draft.status.replace("_", " ")}</span><span class="pill">Overall ${currentPick}</span><span class="pill ${onClock || state.draftIssue ? "warn" : ""}">${state.draftIssue ? "CLAIM A SLOT" : onClock ? "YOU ARE ON THE CLOCK" : state.targetPick ? `Your pick ${state.targetPick}` : "Draft complete"}</span><span id="fp-usage" class="pill">FP ${b.config.fantasyProsUsage.calls}/50</span>`;
  const warning = warningText();
  $("#warning").textContent = warning ? `Using fallback or stale data: ${warning}` : "";
  $("#warning").classList.toggle("hidden", !warning);
  $("#key-panel").classList.toggle("hidden", b.config.fantasyProsConfigured);
  $("#recommendation-title").textContent = onClock ? "Pick now" : `Projected choices at ${state.targetPick || "draft end"}`;
  const recommendations = selectRecommendations(state.ranked);
  if (onClock) logDecision(currentPick, recommendations, roster);
  $("#cards").innerHTML = recommendations.map((player, index) => card(player, index)).join("") || `<div class="small">No candidates available.</div>`;
  $("#roster").innerHTML = roster.length ? roster.map(player => `<div><b>${player.position}</b> ${player.name}<br><span class="small">Bye ${player.bye || "?"}</span></div>`).join("") : `<div class="small">No picks yet.</div>`;
  $("#predictions").innerHTML = state.predictions.length ? state.predictions.map(item => `<div class="prediction"><b>${item.pickNo}. ${item.player.name}</b><br><span class="small">${item.ownerName} · ${item.player.position}</span></div>`).join("") : `<div class="small">You are on the clock or the draft has ended.</div>`;
  renderTable(followingPick);
  renderSources();
  loadNews(recommendations.map(player => player.id));
}

function logDecision(pickNo, recommendations, roster) {
  const fields = player => ({ id: player.id, name: player.name, position: player.position, team: player.team, score: player.score, points: player.points, vorp: player.vorp, baseRank: player.baseRank, valueVsPick: player.valueVsPick, adp: player.adp, adpSource: player.adpSource, secondaryAdp: player.secondaryAdp, ecr: player.ecr, confidence: player.confidence, reasons: player.reasons, risks: player.risks });
  const signature = JSON.stringify([pickNo, recommendations.map(player => player.id), roster.map(player => player.id)]);
  if (signature === state.loggedDecision) return;
  state.loggedDecision = signature;
  json(apiUrl("/api/decision-log"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pickNo, recommendations: recommendations.map(fields), roster: roster.map(fields) }) }).catch(error => {
    if (state.loggedDecision === signature) state.loggedDecision = "";
    console.warn("Decision log failed", error);
  });
}

function card(player, index) {
  const label = index === 0 ? "RECOMMENDATION" : `ALTERNATIVE ${index}`;
  return `<article class="card" data-player="${player.id}"><div class="rank">${label}</div><div class="name">${player.name}</div><div class="meta">${player.position} · ${player.team} · Bye ${player.bye || "?"} · Playoffs ${player.playoffOpponents.join("/")}</div><div class="metrics"><div class="metric"><span class="small">Projection</span><b>${fmt(player.points)}</b></div><div class="metric" title="Projected season points above the current replacement-level player at the same position"><span class="small">VORP points</span><b>${fmt(player.vorp)}</b></div><div class="metric" title="Positive means the model values this player earlier than your current draft slot"><span class="small">Pick value</span><b>${pickValue(player.valueVsPick)}</b></div><div class="metric"><span class="small">ADP${player.adpSource ? ` (${player.adpSource})` : ""} / ECR</span><b>${fmt(player.adp)} / ${fmt(player.ecr)}</b></div>${player.turnAvailability == null ? "" : `<div class="metric"><span class="small">Available at turn</span><b>${pct(player.turnAvailability)}</b></div>`}<div class="metric"><span class="small">Available next</span><b>${pct(player.availability)}</b></div><div class="metric"><span class="small">Source agreement</span><b>${player.confidence}</b></div><div class="metric"><span class="small">Positional drop</span><b>${fmt(player.cliff)}</b></div></div><div class="score">${player.reasons.join(" · ") || "best combined value"}</div>${player.risks.length ? `<div class="risk">Watch: ${player.risks.join(" · ")}</div>` : `<div class="small">No current warning</div>`}<div class="card-actions"><button data-news="${player.id}">News</button><button data-exclude="${player.id}">Exclude</button></div></article>`;
}

function renderTable() {
  const query = $("#search").value.toLowerCase();
  const position = $("#position").value;
  const base = state.showExcluded ? state.players.filter(player => state.excluded.has(player.id)) : state.ranked;
  const rows = base.filter(player => (position === "ALL" || player.position === position) && player.name.toLowerCase().includes(query)).slice(0, 150);
  $("#players").innerHTML = rows.map((player, index) => `<tr><td>${index + 1}</td><td><button class="link" data-news="${player.id}">${player.name}</button><div class="small">${player.team}</div></td><td>${player.position}</td><td>${fmt(player.points)}</td><td>${fmt(player.vorp)}</td><td>${fmt(player.adp)}</td><td>${pct(player.availability)}</td><td>${player.bye || "—"}</td><td class="${player.risks?.length ? "negative" : ""}">${player.risks?.[0] || "—"}</td><td><button data-exclude="${player.id}">${state.excluded.has(player.id) ? "Restore" : "Exclude"}</button></td></tr>`).join("");
}

function renderSources() {
  const b = state.bootstrap;
  const item = (name, source) => {
    const records = source?.data?.players?.length;
    return `${name}${source?.data?.public_api_limited ? " sample" : ""}${Number.isFinite(records) ? ` (${records} records)` : ""}: ${source?.stale ? "stale, " : ""}${age(source?.fetchedAt)}`;
  };
  const weights = `${RANKING_WEIGHTS.market * 100}% mean available market rank (Sleeper ADP, FFC ADP, FantasyPros ECR) + ${RANKING_WEIGHTS.projectionValue * 100}% projection-value rank. Projections use ${PROJECTION_WEIGHTS.fantasyPros * 100}% FantasyPros / ${PROJECTION_WEIGHTS.sleeper * 100}% Sleeper when both exist; otherwise Sleeper.`;
  $("#sources").textContent = `${[item("Sleeper projections", b.projections), item("FFC ADP", b.adp), item("FantasyPros rankings", b.fantasyPros.rankings), item("FantasyPros projections", b.fantasyPros.projections)].join(" · ")} | Rank blend: ${weights}`;
}

async function loadNews(ids) {
  if (!ids.length) return;
  try {
    const response = await json(`/api/news?player_ids=${ids.join(",")}`);
    state.bootstrap.config.fantasyProsUsage = response.fantasyProsUsage;
    if ($("#fp-usage")) $("#fp-usage").textContent = `FP ${response.fantasyProsUsage.calls}/50`;
    const sleeperStories = response.sleeper.flatMap(source => data(source) || []).map(story => ({ title: story.metadata?.title, source: story.source, published: story.published, url: story.metadata?.url }));
    const candidates = ids.map(id => state.players.find(player => player.id === id)).filter(Boolean);
    const fantasyProsStories = (data(response.fantasyPros)?.items || []).filter(story => candidates.some(player => normalizeName(story.title).includes(normalizeName(player.name.split(" ").at(-1))))).map(story => ({ title: story.title, source: "fantasypros", published: Date.parse(`${story.created}Z`), url: story.link }));
    const stories = [...sleeperStories, ...fantasyProsStories].sort((a, b) => b.published - a.published).slice(0, 9);
    $("#news").innerHTML = stories.length ? stories.map(story => `<div class="news-item"><b>${story.title || story.source}</b><br><span>${new Date(story.published).toLocaleString()} · ${story.source}</span>${story.url ? `<br><a href="${story.url}" target="_blank" rel="noreferrer">Open source</a>` : ""}</div>`).join("") : "No recent candidate news.";
  } catch (error) { $("#news").textContent = `News unavailable: ${error.message}`; }
}

function decisionBrief() {
  const top = selectRecommendations(state.ranked).map((player, index) => `${index + 1}. ${player.name} (${player.position}, ${player.team}) | projection ${fmt(player.points)} | ADP ${fmt(player.adp)} | ECR ${fmt(player.ecr)} | confidence ${player.confidence} | available next ${pct(player.availability)} | risks: ${player.risks.join("; ") || "none flagged"}`).join("\n");
  const picks = state.picks.slice(-8).map(pick => `${pick.pick_no}. ${pick.metadata?.first_name || ""} ${pick.metadata?.last_name || ""} (${pick.metadata?.position || "?"})`).join("; ");
  return `Minnesota Madness decision brief\nCurrent overall pick: ${state.picks.length + 1}\nMy next pick: ${state.targetPick}\nTop choices:\n${top}\nRecent picks: ${picks}\nPlease verify breaking news and recommend the best championship-focused selection.`;
}

document.addEventListener("click", event => {
  const id = event.target.dataset.exclude;
  if (id) {
    state.excluded.has(id) ? state.excluded.delete(id) : state.excluded.add(id);
    localStorage.setItem("excluded", JSON.stringify([...state.excluded]));
    recalculate();
  }
  if (event.target.dataset.news) loadNews([event.target.dataset.news]);
});
$("#search").addEventListener("input", renderTable);
$("#position").addEventListener("change", renderTable);
$("#show-excluded").addEventListener("click", () => { state.showExcluded = !state.showExcluded; $("#show-excluded").textContent = state.showExcluded ? "Show available" : "Show excluded"; renderTable(); });
$("#copy").addEventListener("click", async () => { await navigator.clipboard.writeText(decisionBrief()); $("#copy").textContent = "Copied"; setTimeout(() => $("#copy").textContent = "Copy decision brief", 1200); });
$("#refresh").addEventListener("click", () => load(true));
$("#league").classList.toggle("hidden", !mockDraftId);
$("#mock").addEventListener("click", () => {
  const draftId = parseDraftId(globalThis.prompt("Paste the Sleeper mock draft URL or draft ID") || "");
  if (!draftId) {
    $("#warning").textContent = "That does not look like a Sleeper draft URL or ID.";
    $("#warning").classList.remove("hidden");
    return;
  }
  pageUrl.searchParams.set("draft", draftId);
  globalThis.location.href = pageUrl;
});
$("#league").addEventListener("click", () => { globalThis.location.href = "/"; });
$("#save-key").addEventListener("click", async () => {
  const key = $("#key").value.trim();
  try {
    await json("/api/fantasypros-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
    $("#key").value = "";
    await load(true);
  } catch (error) { $("#warning").textContent = error.message; $("#warning").classList.remove("hidden"); }
});

async function load() {
  if (state.loading) return;
  state.loading = true;
  try {
    state.bootstrap = await json(apiUrl("/api/bootstrap"));
    build();
  } catch (error) {
    $("#warning").textContent = `Startup failed: ${error.message}`;
    $("#warning").classList.remove("hidden");
  } finally { state.loading = false; }
}

async function poll() {
  try {
    if (!state.bootstrap) return;
    const latest = await json(apiUrl("/api/draft-state"));
    if (latest.picks.stale || latest.draft.stale) {
      $("#warning").textContent = `Sleeper sync is stale: ${latest.picks.error || latest.draft.error || "retrying"}`;
      $("#warning").classList.remove("hidden");
    } else {
      const warning = warningText();
      $("#warning").textContent = warning ? `Using fallback or stale data: ${warning}` : "";
      $("#warning").classList.toggle("hidden", !warning);
    }
    const picks = data(latest.picks) || [];
    if (JSON.stringify(picks) !== JSON.stringify(state.picks)) {
      state.bootstrap.draft = latest.draft;
      state.picks = picks;
      state.bootstrap.picks = latest.picks;
      recalculate();
    }
  } catch (error) {
    $("#warning").textContent = `Sleeper sync failed: ${error.message}`;
    $("#warning").classList.remove("hidden");
  } finally {
    setTimeout(poll, 750);
  }
}

await load();
setTimeout(poll, 750);
setInterval(load, 5 * 60_000);
