const POSITIONS = ["QB", "RB", "WR", "TE"];
export const RANKING_WEIGHTS = { market: 0.65, projectionValue: 0.35 };
export const PROJECTION_WEIGHTS = { fantasyPros: 0.55, sleeper: 0.45 };

export function normalizeName(value = "") {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(jr|sr|ii|iii|iv)\b/g, "").replace(/[^a-z0-9]/g, "");
}

export function parseDraftId(value = "") {
  return value.trim().match(/(?:^|\/)(\d{15,20})(?:[/?#]|$)/)?.[1] || null;
}

export function pickSlot(pickNo, teams = 12, reversalRound = 3) {
  const round = Math.ceil(pickNo / teams);
  const inRound = (pickNo - 1) % teams + 1;
  const ascending = reversalRound === 3 ? round === 1 || (round >= 3 && round % 2 === 0) : round % 2 === 1;
  return ascending ? inRound : teams - inRound + 1;
}

export function nextPickForSlot(afterPick, slot, rounds = 15, teams = 12, reversalRound = 3) {
  for (let pick = afterPick + 1; pick <= rounds * teams; pick += 1) if (pickSlot(pick, teams, reversalRound) === slot) return pick;
  return null;
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

export function availabilityAt(player, pickNo) {
  if (!pickNo || !Number.isFinite(player.adp)) return null;
  const deviation = Math.max(Number(player.adpSd) || 0, 4, player.adp * 0.12);
  return Math.max(0, Math.min(1, 0.5 * (1 + erf((player.adp - pickNo) / (deviation * Math.SQRT2)))));
}

export function buildPlayers({ projections = [], adp = [], fpRankings = [], fpProjections = [], schedule = [] }) {
  const ffc = new Map(adp.map(player => [normalizeName(player.name), player]));
  const rankings = new Map(fpRankings.map(player => [normalizeName(player.player_name), player]));
  const fpProj = new Map(fpProjections.map(player => [normalizeName(player.name), player]));
  const playoff = new Map();
  for (const game of schedule.filter(game => game.week >= 15 && game.week <= 17)) {
    playoff.set(`${game.home}-${game.week}`, game.away);
    playoff.set(`${game.away}-${game.week}`, game.home);
  }
  const defenses = new Map(projections.filter(record => ["DEF", "DST"].includes(record.player?.position)).map(record => [record.team, Number(record.stats?.pts_half_ppr || 0)]));
  const defenseValues = [...defenses.values()];
  const defenseMean = defenseValues.reduce((sum, value) => sum + value, 0) / Math.max(1, defenseValues.length);
  const defenseDeviation = Math.sqrt(defenseValues.reduce((sum, value) => sum + (value - defenseMean) ** 2, 0) / Math.max(1, defenseValues.length)) || 1;

  return projections.filter(record => POSITIONS.includes(record.player?.position)).map(record => {
    const name = `${record.player.first_name || ""} ${record.player.last_name || ""}`.trim();
    const key = normalizeName(name);
    const market = ffc.get(key);
    const fpRank = rankings.get(key);
    const fp = fpProj.get(key);
    const sleeperPoints = Number(record.stats?.pts_half_ppr || 0) + (record.player.position === "TE" ? 0.5 * Number(record.stats?.rec || 0) : 0);
    const fpHalf = Number(fp?.stats?.points_half || 0) + (record.player.position === "TE" ? 0.5 * Number(fp?.stats?.rec_rec || 0) : 0);
    const points = fpHalf > 0 ? PROJECTION_WEIGHTS.fantasyPros * fpHalf + PROJECTION_WEIGHTS.sleeper * sleeperPoints : sleeperPoints;
    const sleeperAdp = Number(record.stats?.adp_half_ppr);
    const ffcAdp = Number(market?.adp);
    const hasSleeperAdp = sleeperAdp > 0 && sleeperAdp < 900;
    const hasFfcAdp = Number(market?.times_drafted) >= 20 && Number.isFinite(ffcAdp);
    const adp = hasSleeperAdp ? sleeperAdp : hasFfcAdp ? ffcAdp : null;
    const playoffOpponents = [15, 16, 17].map(week => playoff.get(`${record.team || record.player.team}-${week}`) || "BYE");
    // ponytail: DST projections are a weak schedule proxy; use position-specific matchups if this becomes a season tool.
    const playoffScore = Math.max(-2, Math.min(2, playoffOpponents.reduce((sum, opponent) => sum + (defenseMean - (defenses.get(opponent) ?? defenseMean)) / defenseDeviation, 0) / 3));
    return {
      id: String(record.player_id), name, position: record.player.position, team: record.team || record.player.team,
      bye: Number(market?.bye) || null,
      adp,
      adpSource: hasSleeperAdp ? "Sleeper" : adp == null ? null : "FFC",
      secondaryAdp: hasSleeperAdp && hasFfcAdp ? ffcAdp : null,
      adpSd: !hasSleeperAdp && hasFfcAdp ? Number(market?.stdev) || null : null,
      ecr: Number(fpRank?.rank_ecr) || null,
      ecrMin: Number(fpRank?.rank_min) || null,
      ecrMax: Number(fpRank?.rank_max) || null,
      points, sleeperPoints, fpPoints: fpHalf || null,
      receptions: Number(record.stats?.rec || 0),
      injuryStatus: record.player.injury_status,
      injuryNotes: record.player.injury_notes,
      yearsExp: Number(record.player.years_exp),
      updatedAt: Number(record.last_modified || record.updated_at),
      newsUpdated: Number(record.player.news_updated),
      playoffOpponents, playoffScore
    };
  }).filter(player => player.team && player.points > 10 &&
    (Number.isFinite(player.adp) && player.adp < 300 || Number.isFinite(player.ecr) && player.ecr < 300));
}

export function rosterCounts(players) {
  return Object.fromEntries(POSITIONS.map(position => [position, players.filter(player => player.position === position).length]));
}

function riskPenalty(player) {
  const status = (player.injuryStatus || "").toLowerCase();
  if (/ir|pup|out/.test(status)) return 20;
  if (/doubtful/.test(status)) return 12;
  if (/questionable/.test(status)) return 4;
  return 0;
}

function replacementLevels(players) {
  const index = { QB: 11, RB: 35, WR: 47, TE: 13 };
  return Object.fromEntries(POSITIONS.map(position => {
    const list = players.filter(player => player.position === position).sort((a, b) => b.points - a.points);
    return [position, list[Math.min(index[position], list.length - 1)]?.points || 0];
  }));
}

export function rankPlayers(players, { roster = [], currentPick = 1, nextPick = null, excluded = new Set(), replacementPool = players } = {}) {
  const available = players.filter(player => !excluded.has(player.id));
  const replacement = replacementLevels(replacementPool);
  const valueRank = new Map([...available].sort((a, b) => (b.points - replacement[b.position]) - (a.points - replacement[a.position])).map((player, index) => [player.id, index + 1]));
  const counts = rosterCounts(roster);
  const baseSlots = { QB: 1, RB: 2, WR: 3, TE: 1 };
  const finalMinimums = { QB: 1, RB: 4, WR: 5, TE: 1 };
  const positionCeilings = { QB: 2, RB: 7, WR: 8, TE: 2 };
  const flexUsed = ["RB", "WR", "TE"].reduce((sum, position) => sum + Math.max(0, counts[position] - baseSlots[position]), 0);
  const round = Math.ceil(currentPick / 12);
  const remainingAfterPick = 15 - roster.length - 1;
  const missingStarters = POSITIONS.reduce((sum, position) => sum + Math.max(0, baseSlots[position] - counts[position]), 0);
  const missingCoreStarters = Math.max(0, baseSlots.RB - counts.RB) + Math.max(0, baseSlots.WR - counts.WR);
  const missingFinalMinimums = POSITIONS.reduce((sum, position) => sum + Math.max(0, finalMinimums[position] - counts[position]), 0);

  return available.map(player => {
    const vorp = player.points - replacement[player.position];
    const fillsBase = counts[player.position] < baseSlots[player.position];
    const fillsFlex = !fillsBase && player.position !== "QB" && flexUsed < 2;
    const starterNeed = fillsBase ? (["RB", "WR"].includes(player.position) ? 12 : 4) : fillsFlex ? 1.5 : 0;
    const depthPressure = ["RB", "WR"].includes(player.position) ? Math.max(0, round - 8) * 3 * Math.max(0, finalMinimums[player.position] - counts[player.position]) : 0;
    // ponytail: protect required RB/WR slots before adding bench luxuries; tune only from replayed drafts.
    const benchLuxuryPenalty = !fillsBase && !fillsFlex ? missingCoreStarters > 0 ? 30 : missingStarters > 0 ? 5 : 0 : 0;
    const duplicatePenalty = player.position === "QB" && counts.QB >= 1 ? (round < 13 ? 22 : 8) :
      player.position === "TE" && counts.TE >= 1 ? (round < 12 ? 15 : 8) : 0;
    const missingPosition = fillsBase;
    const completionPressure = !missingPosition ? 0 : player.position === "QB" ? Math.max(0, round - 5) * 10 :
      player.position === "TE" ? Math.max(0, round - 4) * 12 : Math.max(0, round - 10) * 4;
    const mustFill = missingStarters > remainingAfterPick;
    const completionGuard = mustFill ? (missingPosition ? 100 : -100) : 0;
    const minimumGuard = missingFinalMinimums > remainingAfterPick ? (counts[player.position] < finalMinimums[player.position] ? 100 : -100) : 0;
    const ceilingPenalty = counts[player.position] >= positionCeilings[player.position] ? 100 : 0;
    const sameBye = player.bye ? roster.filter(existing => existing.bye === player.bye).length : 0;
    const byePenalty = sameBye >= 2 ? 5 + Math.max(0, sameBye - 2) * 6 : 0;
    const projectionConflict = player.fpPoints && player.sleeperPoints ? Math.abs(player.fpPoints - player.sleeperPoints) / Math.max(player.fpPoints, player.sleeperPoints) : 0;
    const availability = availabilityAt(player, nextPick);
    const urgency = availability == null ? 0 : (1 - availability) * 4;
    const overallValueRank = currentPick + valueRank.get(player.id) - 1;
    const ranks = [player.adp, player.secondaryAdp, player.ecr, overallValueRank].filter(Number.isFinite);
    const marketRanks = [player.adp, player.secondaryAdp, player.ecr].filter(Number.isFinite);
    const marketRank = marketRanks.length ? marketRanks.reduce((sum, value) => sum + value, 0) / marketRanks.length : null;
    const baseRank = marketRanks.length ? RANKING_WEIGHTS.market * marketRank + RANKING_WEIGHTS.projectionValue * valueRank.get(player.id) : valueRank.get(player.id);
    const valueVsPick = currentPick - baseRank;
    const rankSpread = ranks.length > 1 ? Math.max(...ranks) - Math.min(...ranks) : null;
    const confidence = ranks.length >= 3 && rankSpread < 10 ? "high" : rankSpread != null && rankSpread < 25 ? "medium" : "low";
    const youthUpside = round >= 8 && player.yearsExp <= 2 ? 2.5 : 0;
    const receivingFloor = player.position === "QB" ? 0 : Math.min(1.5, Number(player.receptions || 0) * 0.014);
    const stack = roster.some(existing => existing.team === player.team && ((existing.position === "QB") !== (player.position === "QB"))) ? 1.5 : 0;
    const injury = riskPenalty(player);
    const veteranRb = player.position === "RB" && player.yearsExp >= 8 ? 3 : 0;
    const playoffScore = Number(player.playoffScore || 0);
    const positionList = available.filter(candidate => candidate.position === player.position).sort((a, b) => b.points - a.points);
    const positionIndex = positionList.findIndex(candidate => candidate.id === player.id);
    const cliff = Math.max(0, player.points - (positionList[positionIndex + 3]?.points ?? player.points));
    const cliffBonus = Math.min(3, cliff / 6);
    const conflictPenalty = Math.min(4, projectionConflict * 10);
    const score = 200 - baseRank + starterNeed + depthPressure + urgency + youthUpside + receivingFloor + stack + playoffScore + cliffBonus + completionPressure + completionGuard + minimumGuard - benchLuxuryPenalty - duplicatePenalty - ceilingPenalty - byePenalty - injury - veteranRb - conflictPenalty;
    const reasons = [];
    if (starterNeed >= 4) reasons.push("fills an open starter");
    else if (fillsFlex) reasons.push("fills an open flex starter");
    if (vorp > 0 && overallValueRank <= currentPick + 6) reasons.push("strong value over replacement");
    if (availability != null && availability < 0.3) reasons.push("unlikely to reach your next pick");
    if (marketRank != null && marketRank < currentPick - 4) reasons.push("market value has fallen");
    if (player.position === "TE") reasons.push("benefits from TE premium");
    if (receivingFloor >= 1.2) reasons.push("reception volume supports weekly floor");
    if (stack) reasons.push("adds a useful team stack");
    if (playoffScore > 1) reasons.push("favorable projected playoff opponents");
    if (cliff >= 12) reasons.push("positional drop follows");
    if (completionPressure >= 8) reasons.push("roster must address this position soon");
    if (depthPressure >= 6 && !fillsBase) reasons.push("builds needed position depth");
    if (minimumGuard > 0) reasons.push("needed to preserve a viable final roster");
    const risks = [];
    if (player.injuryStatus) risks.push(`${player.injuryStatus}${player.injuryNotes ? `: ${player.injuryNotes}` : ""}`);
    if (projectionConflict > 0.12) risks.push(`projection sources differ by ${Math.round(projectionConflict * 100)}%`);
    if (Number.isFinite(player.secondaryAdp) && Math.abs(player.adp - player.secondaryAdp) >= 25) risks.push(
      `ADP disagreement: Sleeper ${Math.round(player.adp)}, FFC ${Math.round(player.secondaryAdp)}; ${player.adp > player.secondaryAdp ? "Sleeper drafters may let him fall" : "Sleeper drafters take him earlier"}`
    );
    if (veteranRb) risks.push("veteran RB workload and durability");
    const projectionGap = marketRank == null ? null : marketRank - overallValueRank;
    if (confidence === "low" && projectionGap != null && Math.abs(projectionGap) >= 25) risks.push(`Model projection is ${Math.round(Math.abs(projectionGap))} spots ${projectionGap > 0 ? "more optimistic" : "more pessimistic"} than market`);
    else if (confidence === "low" && !marketRanks.length) risks.push("no current ADP or ECR");
    if (sameBye >= 2) risks.push(`${sameBye + 1} roster players would share Week ${player.bye} bye`);
    return { ...player, score, vorp, valueRank: valueRank.get(player.id), marketRank, baseRank, valueVsPick, availability, projectionConflict, confidence, cliff, reasons, risks };
  }).sort((a, b) => b.score - a.score);
}

export function selectRecommendations(ranked) {
  if (ranked.length < 3) return ranked;
  const first = ranked[0];
  const differentPosition = ranked.slice(1, 12).find(player => player.position !== first.position) || ranked[1];
  const third = ranked.find(player => player.id !== first.id && player.id !== differentPosition.id);
  return [first, differentPosition, third].filter(Boolean);
}

export function historicalPositionRates(historySources = []) {
  const counts = new Map();
  historySources.forEach((source, sourceIndex) => {
    const weight = sourceIndex < 2 ? 1 : 0.2;
    for (const pick of source || []) {
    if (!POSITIONS.includes(pick.position)) continue;
    const bucket = Math.min(5, Math.ceil(pick.round / 3));
    const key = `${pick.picked_by}-${bucket}`;
    const entry = counts.get(key) || { total: 0, QB: 0, RB: 0, WR: 0, TE: 0 };
    entry.total += weight;
    entry[pick.position] += weight;
    counts.set(key, entry);
    }
  });
  return counts;
}

export function simulateToUserPick(players, { picks = [], draft, userId, histories = [] }) {
  // ponytail: one likely path is enough for draft night; add Monte Carlo only if measured prediction accuracy warrants it.
  const teams = Number(draft.settings?.teams || 12);
  const rounds = Number(draft.settings?.rounds || 15);
  const reversal = Number(draft.settings?.reversal_round || 0);
  const userSlot = Number(draft.draft_order?.[userId]);
  const lastPick = picks.length;
  const targetPick = nextPickForSlot(lastPick, userSlot, rounds, teams, reversal);
  if (!targetPick) return { targetPick: null, predictions: [], projectedAvailable: players };
  const drafted = new Set(picks.map(pick => String(pick.player_id)));
  const pool = players.filter(player => !drafted.has(player.id));
  const rosters = new Map();
  for (const pick of picks) {
    const list = rosters.get(String(pick.picked_by)) || [];
    const player = players.find(candidate => candidate.id === String(pick.player_id));
    if (player) list.push(player);
    rosters.set(String(pick.picked_by), list);
  }
  const slotToUser = Object.fromEntries(Object.entries(draft.draft_order || {}).map(([owner, slot]) => [slot, owner]));
  const history = historicalPositionRates(histories);
  const predictions = [];
  const virtualDrafted = new Set(drafted);
  for (let pickNo = lastPick + 1; pickNo < targetPick; pickNo += 1) {
    const slot = pickSlot(pickNo, teams, reversal);
    const owner = slotToUser[slot];
    const roster = rosters.get(String(owner)) || [];
    const counts = rosterCounts(roster);
    const round = Math.ceil(pickNo / teams);
    const bucket = Math.min(5, Math.ceil(round / 3));
    const tendency = history.get(`${owner}-${bucket}`);
    const candidates = pool.filter(player => !virtualDrafted.has(player.id)).map(player => {
      const need = ({ QB: 1, RB: 2, WR: 3, TE: 1 })[player.position] > counts[player.position] ? 5 : 0;
      const habit = tendency?.total ? 3 * tendency[player.position] / tendency.total : 0;
      const market = Number.isFinite(player.adp) ? Math.max(0, 30 - Math.abs(player.adp - pickNo)) : 0;
      return { player, score: market + player.points * 0.035 + need + habit };
    }).sort((a, b) => b.score - a.score);
    const selected = candidates[0]?.player;
    if (!selected) break;
    virtualDrafted.add(selected.id);
    roster.push(selected);
    rosters.set(String(owner), roster);
    predictions.push({ pickNo, slot, owner, player: selected });
  }
  return { targetPick, predictions, projectedAvailable: pool.filter(player => !virtualDrafted.has(player.id)) };
}
