# Fantasy Draft Companion

A live decision aid for one fantasy football draft. Its recommendations aim to improve the user's chance of winning the league championship.

## Language

**Championship probability**:
The chance that a drafted roster wins the league playoffs, accounting for regular-season qualification and playoff-week performance.
_Avoid_: Best roster, draft winner

**Weekly high-score prize**:
The $10 award for the roster with the highest score in a regular-season week.
_Avoid_: Weekly prize

**Regular-season record prize**:
The $100 award for the best regular-season record, subordinate to winning the league playoffs.
_Avoid_: Season prize

**Draft state**:
The current set of completed picks, roster compositions, available players, and future pick ownership.
_Avoid_: Draft board

**Recommendation**:
The player the companion considers the best selection at the user's current pick for championship probability.
_Avoid_: Best available player

**Alternative**:
A credible selection behind the recommendation that represents a different risk, positional, or roster-construction choice.
_Avoid_: Backup pick

**Availability probability**:
The estimated chance that a player remains undrafted when the user next picks.
_Avoid_: ADP

**Positional cliff**:
A sharp drop in expected roster value between the remaining players at one position.
_Avoid_: Tier break

**Opponent model**:
An estimate of which players other managers may select, based on draft position, roster construction, and market behavior.
_Avoid_: Pick prediction

**Decision brief**:
A compact snapshot of the draft state and leading candidates used for deeper on-clock analysis.
_Avoid_: Prompt, export

**Risk flag**:
A specific condition that could materially reduce a candidate's championship value, presented with its likelihood or uncertainty when known.
_Avoid_: Red flag, concern

**Player exclusion**:
A reversible instruction from the user that removes a player from recommendations without treating the player as drafted.
_Avoid_: Do-not-draft list, ban

**Live ranking**:
The current ordering of available players after accounting for draft state, new evidence, and the user's roster construction.
_Avoid_: Static rankings, cheat sheet

**Bye-week resilience**:
A roster's ability to field a competitive lineup when several drafted players are unavailable during scheduled bye weeks.
_Avoid_: Bye-week coverage

## Draft grading

**Draft report**:
A personal evaluation of the rosters assembled in a completed draft. Trades, waiver claims, and other roster moves after the draft do not change which players it evaluates.
_Avoid_: Live team evaluation

**Overall roster grade**:
A letter grade comparing a team's drafted roster with the other teams in its league, based on projected production and useful depth in the evaluation snapshot. Written analysis describes supported upside and risk.
_Avoid_: Draft execution grade

**Draft-day evidence**:
Information available by draft completion that supports grades and explanations. Later news, projections, and results are excluded.
_Avoid_: Current player outlook

**Evaluation snapshot**:
The fixed body of evidence used to evaluate every drafted roster. It uses draft-day evidence when available, or a clearly dated later evaluation when that evidence is insufficient.
_Avoid_: Live grade

**Starter grade**:
A position group's letter grade for its contribution to the starting lineup, including players assigned to FLEX.
_Avoid_: Position slot grade

**Depth grade**:
A position group's letter grade for the remaining drafted players behind its starters. Players counted as starters, including FLEX starters, are not also counted as depth.
_Avoid_: Bench quantity
