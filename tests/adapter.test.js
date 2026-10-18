import {test} from "node:test";
import assert from "node:assert/strict";
import {AAAdapter, searchMenus} from "../scripts/aa-adapter.js";

const menus = () => Object.fromEntries(["melee", "range", "ontoken", "templatefx", "aura", "preset"].map(m => [m, []]));
function setup(entries = {}, disabled = false) {
  const game = {user: {isGM: true}, version: "14.369", system: {id: "pf2e"},
    modules: new Map([["autoanimations", {active: true, version: "7.1.5"}], ["sequencer", {active: true}]]),
    settings: {get: () => disabled}, i18n: {localize: key => key}};
  return new AAAdapter({game, api: {AutorecManager: {getAutorecEntries: () => ({...menus(), ...entries})}},
    config: {PF2E: {baseWeaponTypes: {longsword: "Longsword"}, weaponGroups: {sword: "Sword"}}}});
}
const spell = (name, flags) => ({name, type: "spell", system: {}, flags: flags ? {autoanimations: flags} : {}});

test("exact match is case sensitive; partial names ignore whitespace; longest wins", () => {
  const entries = [{label: "Fire", menu: "ontoken"}, {label: "Fire Ball", menu: "templatefx"},
    {label: "FIREBALL", menu: "range", advanced: {exactMatch: true}}];
  assert.equal(searchMenus(entries, "FIREBALL").menu, "range");
  assert.equal(searchMenus(entries, "fire ball rank 3").menu, "templatefx");
  assert.equal(searchMenus(entries, "Fire Bolt").label, "Fire");
  assert.equal(entries[0].label, "Fire");
});
test("excluded terms apply only to partial matches, as in AA", () => {
  const entries = [{label: "Ray", advanced: {excludedTerms: ["Frost"]}}];
  assert.equal(searchMenus(entries, "Ray of Frost"), undefined);
  assert.ok(searchMenus(entries, "Scorching Ray"));
  assert.ok(searchMenus([{label: "Ray", advanced: {exactMatch: true, excludedTerms: ["Ray"]}}], "Ray"));
});
test("distinguishes override, disabled, autorec, missing without writes", () => {
  const adapter = setup({templatefx: [{label: "Fireball", menu: "templatefx"}]});
  const item = spell("Fireball");
  item.update = () => { throw new Error("Read-only path must never update"); };
  assert.equal(adapter.status(item).kind, "autorec");
  assert.equal(adapter.status(spell("Unknown")).kind, "missing");
  assert.equal(adapter.status(spell("Fireball", {version: 5, isEnabled: false})).kind, "disabled");
  assert.equal(adapter.status(spell("Fireball", {version: 5, isCustomized: true, menu: "range"})).kind, "item");
  assert.equal(adapter.status(spell("Fireball", {version: 4, killAnim: true})).kind, "disabled");
  assert.equal(adapter.status(spell("Fireball", {version: 4, override: true})).kind, "unknown");
  assert.equal(adapter.status(spell("Fireball", {version: 5, isCustomized: true, menu: "nonsense"})).kind, "unknown");
});
test("global disable preserves custom overrides", () => {
  const adapter = setup({}, true);
  assert.equal(adapter.status(spell("Fireball")).kind, "disabled");
  assert.equal(adapter.status(spell("Fireball", {version: 5, isCustomized: true, menu: "range"})).kind, "item");
});
test("weapon base-type/group fallback and variant fallback", () => {
  const adapter = setup({melee: [{label: "Sword", menu: "melee"}], ontoken: [{label: "Heal", menu: "ontoken"}]});
  assert.equal(adapter.status({name: "Custom Blade", type: "weapon", baseType: "longsword", group: "sword"}).kind, "autorec");
  assert.equal(adapter.status({...spell("Three actions"), isVariant: true, original: {name: "Heal"}}).kind, "autorec");
});
test("AoE uses AA's template-specific menu restriction", () => {
  const adapter = setup({range: [{label: "Fireball", menu: "range"}]});
  const item = spell("Fireball");
  assert.equal(adapter.status(item).kind, "autorec");
  item.system.area = {value: 20, type: "burst"};
  assert.equal(adapter.status(item).kind, "missing");
});
test("malformed or unavailable global data remains unknown, never missing", () => {
  const adapter = setup({range: [{label: 4}]});
  assert.equal(adapter.status(spell("Fireball")).kind, "unknown");
  adapter.game.modules.get("autoanimations").version = "8.0.0";
  assert.match(adapter.check(), /only supports AA 7/);
});
test("original AA V2 control is invoked with actual sheet and item", async () => {
  const adapter = setup();
  let opened = 0;
  const item = {id: "spell", sheet: {document: null}};
  item.sheet.document = item;
  item.actor = {items: new Map([[item.id, item]])};
  adapter.hooks = {callAll: (name, sheet, controls) => {
    assert.equal(name, "getHeaderControlsApplicationV2");
    assert.equal(sheet.document, item);
    controls.push({class: "aaItemSettings", onClick: async () => { opened++; }});
  }};
  await adapter.openEditor(item);
  assert.equal(opened, 1);
  item.isVariant = true;
  await assert.rejects(adapter.openEditor(item), /safely editable/);
});
test("legacy control fallback and missing control error", async () => {
  const adapter = setup();
  let opened = false;
  const item = {id: "a", sheet: {}};
  item.actor = {items: new Map([["a", item]])};
  adapter.hooks = {callAll: (name, sheet, controls) => {
    if (name === "getItemSheetHeaderButtons") controls.push({class: "aaItemSettings", onclick: async () => { opened = true; }});
  }};
  await adapter.openEditor(item);
  assert.equal(opened, true);
  adapter.hooks.callAll = () => {};
  await assert.rejects(adapter.openEditor(item), /not found/);
});
test("GM and dependency checks gate all entry points", async () => {
  const adapter = setup();
  adapter.game.user.isGM = false;
  await assert.rejects(adapter.openEditor({}), /GM/);
  assert.throws(() => adapter.openAutorec(), /GM/);
});
