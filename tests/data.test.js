import {test} from "node:test";
import assert from "node:assert/strict";
import {sceneActors, actorAbilities, filterAbilities, summarize} from "../scripts/pf2e-data.js";
const item = (id, type, extra = {}) => ({id, uuid: `Actor.a.Item.${id}`, name: id, type, system: {}, ...extra});
test("linked actors deduplicate; unlinked tokens remain independent; missing ignored", () => {
  const actor = {uuid: "Actor.a", type: "npc", name: "Goblin"};
  const tokens = [1,2,3,4].map(n => ({uuid: `Scene.s.Token.${n}`, name: `Goblin ${n}`, actor, actorLink: n < 3}));
  tokens.push({uuid: "missing"}, {uuid: "loot", actor: {type: "loot"}});
  const result = sceneActors({tokens});
  assert.equal(result.actors.length, 3);
  assert.equal(result.actors.find(g => g.key === "Actor.a").tokens.length, 2);
  assert.equal(result.missing, 1);
  assert.equal(sceneActors(null).actors.length, 0);
});
test("PF2e item types, active feats, collections, variants and embedded spells", () => {
  const base = item("fire", "spell");
  const variant = item("fire", "spell", {name: "Fire variant", variantId: "overlay", original: base, isVariant: true});
  base.overlays = {overrideVariants: [variant]};
  const embedded = item("embedded", "spell", {parentItem: {id: "wand"}});
  const transient = item("staff-spell", "spell");
  const items = [base, item("sword", "weapon"), item("claw", "melee"), item("reaction", "feat", {system: {actionType: {value: "reaction"}}}),
    item("passive", "feat", {system: {actionType: {value: "passive"}}}), item("action", "action"), item("wand", "consumable", {embeddedSpell: embedded}), item("effect", "effect")];
  const actor = {items, system: {actions: [{item: items[1]}, {item: item("unarmed", "weapon")}]},
    spellcasting: {get: () => ({name: "Arcane"}), collections: new Map([["staff", {contents: [base, transient], entry: {name: "Staff"}}]])}};
  const {abilities, warnings} = actorAbilities(actor);
  assert.equal(abilities.length, 9);
  assert.equal(warnings.length, 0);
  assert.equal(abilities.find(r => r.name === "Fire variant").editItem, base);
  assert.equal(abilities.find(r => r.name === "embedded").editItem, null);
  assert.equal(abilities.find(r => r.name === "staff-spell").editItem, null);
  assert.equal(abilities.filter(r => r.name === "sword").length, 1);
  assert.equal(abilities.find(r => r.name === "fire").source, "Arcane");
  assert.ok(!abilities.some(r => ["passive", "effect"].includes(r.name)));
});
test("variant getter failure is visible, remaining abilities survive", () => {
  const spell = item("broken", "spell", {overlays: {get overrideVariants() { throw new Error("bad overlay"); }}});
  const result = actorAbilities({items: [spell, item("sword", "weapon")]});
  assert.equal(result.abilities.length, 2);
  assert.match(result.warnings[0], /bad overlay/);
});
test("missing filter excludes disabled/unknown; summary partitions correctly", () => {
  const rows = ["item", "autorec", "disabled", "missing", "unknown"].map((kind, i) => ({name: `Spell ${i}`, category: "spell", source: "Arcane", status: {kind}}));
  assert.equal(filterAbilities(rows, {status: "missing"}).length, 1);
  assert.equal(filterAbilities(rows, {query: "ARCANE", category: "spell"}).length, 5);
  assert.equal(filterAbilities(rows, {category: "attack"}).length, 0);
  assert.deepEqual(summarize(rows), {total: 5, configured: 2, disabled: 1, missing: 1, unknown: 1});
});
