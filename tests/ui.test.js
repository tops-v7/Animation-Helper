import {test} from "node:test";
import assert from "node:assert/strict";
import {parseHTML} from "linkedom";

// DOM interaction test with a lifecycle harness, not a substitute for Foundry.
test("manager renders scene data, escapes names, handles filters, editor and cleanup", async () => {
  const {document, Event} = parseHTML("<!doctype html><html><body></body></html>");
  globalThis.document = document;
  const listeners = new Map();
  let hookId = 0;
  globalThis.Hooks = {
    on: (name, fn) => { const id = ++hookId; listeners.set(id, {name, fn}); return id; },
    off: (name, id) => listeners.delete(id),
    callAll: (name, ...args) => { for (const listener of listeners.values()) if (listener.name === name) listener.fn(...args); }
  };
  globalThis.foundry = {applications: {api: {ApplicationV2: class {
    constructor() { this.content = document.createElement("div"); document.body.append(this.content); }
    async render() {
      if (this._canRender() === false) return this;
      const html = await this._renderHTML();
      this._replaceHTML(html, this.content);
      this.rendered = true;
      this._onRender();
      return this;
    }
  }}}};
  const game = globalThis.game = {user: {isGM: true}, version: "14.369", system: {id: "pf2e"},
    modules: new Map([["autoanimations", {active: true, version: "7.1.8"}], ["sequencer", {active: true}]]),
    settings: {get: () => false}, i18n: {localize: k => k}};
  const menus = Object.fromEntries(["melee", "range", "ontoken", "templatefx", "aura", "preset"].map(m => [m, []]));
  menus.templatefx.push({label: "Fireball", menu: "templatefx"});
  globalThis.AutomatedAnimations = {AutorecManager: {getAutorecEntries: () => menus}};
  globalThis.ui = {notifications: {warn: message => assert.fail(message), error: message => assert.fail(message)}};
  const actor = {name: '<img src=x onerror="alert(1)">', type: "character", uuid: "Actor.pc", items: new Map()};
  const spell = {name: "Fireball", type: "spell", id: "fire", uuid: "Actor.pc.Item.fire", system: {}, actor};
  spell.sheet = {document: spell};
  const action = {name: "Unconfigured", type: "action", id: "action", uuid: "Actor.pc.Item.action", system: {}, actor};
  actor.items.set("fire", spell); actor.items.set("action", action);
  const npc = {name: "Goblin", type: "npc", uuid: "Actor.npc", items: new Map()};
  globalThis.canvas = {ready: true, scene: {name: "Encounter", tokens: new Map([
    ["pc", {uuid: "Token.pc", actor, actorLink: true}], ["npc", {uuid: "Token.npc", name: "Goblin", actor: npc, actorLink: false}]
  ])}};
  const {SceneAnimationManager} = await import("../scripts/manager.js");
  const app = new SceneAnimationManager();
  await app.render();
  const content = app.content;
  assert.match(content.textContent, /Encounter/);
  assert.match(content.textContent, /1 PCs · 1 NPCs/);
  assert.equal(content.querySelectorAll("img").length, 0);
  assert.equal(content.querySelectorAll("[data-ability]").length, 2);
  const select = content.querySelector("select[name=status]");
  select.querySelector('option[value=""]').removeAttribute("selected");
  select.querySelector('option[value="missing"]').setAttribute("selected", "");
  select.dispatchEvent(new Event("change", {bubbles: true}));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(content.querySelectorAll("[data-ability]").length, 1);
  assert.match(content.querySelector("[data-ability]").textContent, /Unconfigured/);
  let edited;
  app.adapter.openEditor = async item => { edited = item; };
  content.querySelector('[data-action="editor"]').click();
  assert.equal(edited, action);
  spell.flags = {autoanimations: {version: 5, isEnabled: false}};
  Hooks.callAll("updateItem", spell);
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(app.projections[0].summary.disabled, 1);
  content.querySelector('[data-actor="Token.npc"]').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.actorKey, "Token.npc");
  assert.match(content.textContent, /No matching abilities/);
  assert.ok(listeners.size > 0);
  app._onClose();
  assert.equal(listeners.size, 0);
  game.user.isGM = false;
  assert.equal(app._canRender(), false);
});
