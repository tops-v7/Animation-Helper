/** Execute AA's actual resolver and header hook against our adapter.
 * Usage: node tools/verify-aa.mjs /path/to/autoanimations
 * Loads local trusted reference source; does not execute animations or update items.
 */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import {AAAdapter} from "../scripts/aa-adapter.js";
const root = process.argv[2];
if (!root) throw new Error("Pass the checked-out AA source directory");
const read = path => readFileSync(resolve(root, path), "utf8");
const stripImports = code => code.replace(/^import .*;?\r?\n/gm, "").replace(/\bexport /g, "");
const menus = Object.fromEntries(["melee", "range", "ontoken", "templatefx", "aura", "preset", "aefx"].map(menu => [menu, []]));
menus.range.push({label: "Ray", menu: "range", advanced: {excludedTerms: ["Frost"]}});
menus.templatefx.push({label: "Fireball", menu: "templatefx"});
menus.ontoken.push({label: "Heal", menu: "ontoken"}, {label: "HEAL", menu: "ontoken", advanced: {exactMatch: true}});
menus.melee.push({label: "Sword", menu: "melee"});
const callbacks = new Map();
let opened;
const game = {user: {isGM: true}, version: "14.369", system: {id: "pf2e"},
  modules: new Map([["autoanimations", {active: true, version: "7.1.8"}], ["sequencer", {active: true}]]),
  settings: {get: (scope, key) => key === "disableAutoRec" ? false : menus[key.replace("aaAutorec-", "")]}, i18n: {localize: k => k}};
const hooks = {on: (name, fn) => callbacks.set(name, fn), once: () => {}, callAll: (name, ...args) => callbacks.get(name)?.(...args)};
const context = vm.createContext({game, Hooks: hooks, debug: () => {}, custom_warning: () => {},
  flagMigrations: {handle: async item => item.flags?.autoanimations},
  ItemMenuApp: class {constructor(item) { opened = item; } render() {}},
  AEMenuApp: class {constructor() { throw new Error("Unexpected active-effect editor"); }}});
vm.runInContext(stripImports(read("src/aa-classes/aaAutorecFunctions.js")), context);
vm.runInContext(stripImports(read("src/system-handlers/findAnimation.js")), context);
const index = read("src/index.js");
const start = index.indexOf("function registerAAItemHooks()");
const end = index.indexOf("\n/**", start);
assert.ok(start > 0 && end > start, "AA header registration must be identifiable");
vm.runInContext(index.slice(start, end) + "\nregisterAAItemHooks();", context);
const adapter = new AAAdapter({game, hooks, api: {AutorecManager: {getAutorecEntries: () => menus}},
  config: {PF2E: {baseWeaponTypes: {sword: "Sword"}}}});
let checks = 0;
for (const name of ["Fireball", "FIREBALL", "Heal", "HEAL", "Healing", "Ray of Frost", "Ray", "Unknown"]) {
  for (const flags of [{}, {version: 5, isEnabled: false}, {version: 5, isCustomized: true, menu: "range"}]) {
    for (const isTemplate of [false, true]) {
      const item = {type: "spell", name, flags: {autoanimations: flags},
        system: isTemplate ? {area: {value: 20, type: "burst"}} : {}};
      const actual = await context.handleItem({item, isTemplate});
      const projected = adapter.status(item);
      const expectedKind = flags.isEnabled === false ? "disabled" : actual === flags ? "item" : actual ? "autorec" : "missing";
      assert.equal(projected.kind, expectedKind, JSON.stringify({name, flags, isTemplate}));
      if (projected.kind === "autorec") assert.equal(projected.entryLabel, actual.label);
      checks++;
    }
  }
}
const item = {id: "a", documentName: "Item", type: "spell", flags: {}};
item.sheet = {document: item, item};
item.actor = {items: new Map([[item.id, item]])};
await adapter.openEditor(item);
assert.equal(opened, item, "AA's actual header callback must open the editor for the same document");
console.log(`${checks} resolver comparisons and actual AA V2 editor-hook handoff passed.`);
