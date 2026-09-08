import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("mock mode keeps both new-mock and return-to-league actions", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="mock"[^>]*>New mock draft</);
  assert.match(html, /id="league"/);
  assert.match(script, /\$\("#league"\)\.classList\.toggle\("hidden", !mockDraftId\)/);
});

test("UI bootstrap hides expected source limits and schedules a fast poll", async () => {
  const elements = new Map();
  const element = selector => elements.get(selector) || elements.set(selector, {
    value: selector === "#position" ? "ALL" : "", textContent: "", innerHTML: "", dataset: {},
    classList: {
      values: new Set(["hidden"]),
      toggle(name, force) { force ? this.values.add(name) : this.values.delete(name); },
      add(name) { this.values.add(name); },
      remove(name) { this.values.delete(name); }
    },
    addEventListener() {}
  }).get(selector);
  globalThis.document = { querySelector: element, addEventListener() {} };
  globalThis.localStorage = { getItem: () => "[]", setItem() {} };
  globalThis.location = { href: "http://localhost/" };
  Object.defineProperty(globalThis, "navigator", { value: { clipboard: { async writeText() {} } }, configurable: true });
  let pollDelay = Infinity;
  globalThis.setInterval = () => 0;
  globalThis.setTimeout = (_callback, delay) => { pollDelay = Math.min(pollDelay, delay); return 0; };
  const source = data => ({ data, stale: false, fetchedAt: Date.now() });
  const bootstrap = {
    config: { userId: "me", fantasyProsConfigured: true, fantasyProsUsage: { calls: 1 } },
    draft: source({ status: "pre_draft", settings: { teams: 12, rounds: 15, reversal_round: 3 }, draft_order: { me: 7 } }),
    users: source([]), picks: source([]), projections: source([]), adp: source({ players: [] }), schedule: source([]), history: [],
    fantasyPros: { rankings: source({ players: [], public_api_limited: true }), projections: source({ players: [], public_api_limited: true }) }
  };
  globalThis.fetch = async () => ({ ok: true, json: async () => bootstrap });

  await import(`../public/app.js?warning-test=${Date.now()}`);

  assert.equal(element("#warning").textContent, "");
  assert.ok(element("#warning").classList.values.has("hidden"));
  assert.ok(pollDelay <= 1_000, `poll delay was ${pollDelay}ms`);
});
