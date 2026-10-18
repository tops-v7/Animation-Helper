/** AA 7 compatibility boundary. No imports from AA's bundled/private source. */
const MENUS = ["melee", "range", "ontoken", "templatefx", "aura", "preset"];
const rinse = name => String(name ?? "").replace(/\s+/g, "").toLowerCase();
export const STATUS_LABELS = {item: "Item override", autorec: "Autorec", disabled: "Disabled", missing: "Missing", unknown: "Unknown"};
const result = (kind, detail, extra = {}) => ({kind, label: STATUS_LABELS[kind], detail, ...extra});

// Mirrors aaAutorecFunctions: longest label, exact case-sensitive first, then
// whitespace-insensitive substring match and excluded terms. Never mutates AA data.
export function searchMenus(entries, name) {
  const sorted = [...entries].sort((a, b) => rinse(b.label).length - rinse(a.label).length);
  return sorted.find(x => x.advanced?.exactMatch && x.label === name)
    ?? sorted.find(x => !x.advanced?.exactMatch && x.label && rinse(name).includes(rinse(x.label))
      && !(x.advanced?.excludedTerms ?? []).some(term => rinse(name).includes(rinse(term))));
}

export class AAAdapter {
  constructor({game = globalThis.game, hooks = globalThis.Hooks, api = globalThis.AutomatedAnimations,
    config = globalThis.CONFIG, localize} = {}) {
    Object.assign(this, {game, hooks, api, config});
    this.localize = localize ?? (key => game.i18n.localize(key));
  }
  check() {
    if (!this.game.user?.isGM) return "Only the GM can manage animations.";
    if (this.game.system?.id !== "pf2e") return "This module requires Pathfinder Second Edition.";
    if (Number.parseInt(this.game.version) !== 14) return "This prototype supports Foundry VTT 14.";
    const aa = this.game.modules.get("autoanimations");
    if (!aa?.active) return "Automated Animations must be enabled.";
    if (Number.parseInt(aa.version) !== 7) return `AA ${aa.version}: The adapter only supports AA 7.x.`;
    if (!this.game.modules.get("sequencer")?.active) return "Sequencer must be enabled.";
    if (typeof this.api?.AutorecManager?.getAutorecEntries !== "function") return "AA AutorecManager is not available.";
    return null;
  }
  snapshot() {
    const error = this.check();
    if (error) return {error};
    try {
      const menus = this.api.AutorecManager.getAutorecEntries();
      if (MENUS.some(menu => !Array.isArray(menus[menu]))) throw new Error("Unexpected Autorec data format");
      const entries = MENUS.flatMap(menu => menus[menu]);
      if (entries.some(x => !x || typeof x.label !== "string" || (x.advanced?.excludedTerms != null && !Array.isArray(x.advanced.excludedTerms)))) {
        throw new Error("Invalid Autorec entries");
      }
      return {menus, entries, disabled: this.game.settings.get("autoanimations", "disableAutoRec")};
    } catch (error) { return {error: `Unable to read Autorec: ${error.message}`}; }
  }
  status(item, snapshot = this.snapshot()) {
    if (snapshot.error) return result("unknown", snapshot.error);
    try {
      const flags = item.flags?.autoanimations;
      if (flags != null && (typeof flags !== "object" || Array.isArray(flags))) return result("unknown", "Invalid AA flags.");
      if (flags?.killAnim || flags?.isEnabled === false) return result("disabled", "Disabled on the item.");
      if (flags && Object.keys(flags).length && flags.version !== 5) {
        return result("unknown", "Older or unknown AA flags: open the AA editor to review or migrate them.");
      }
      if (flags?.isCustomized) {
        if (!MENUS.includes(flags.menu)) return result("unknown", "Invalid category in the item override.");
        return result("item", `Item · ${flags.menu}`);
      }
      if (snapshot.disabled) return result("disabled", "Global Autorec is disabled; no item override.");
      const names = [item.name];
      if (item.type === "weapon") {
        for (const [table, key] of [["baseWeaponTypes", item.baseType], ["weaponGroups", item.group]]) {
          const label = this.config?.PF2E?.[table]?.[key];
          if (label) names.push(this.localize(label));
        }
      }
      let match;
      for (const name of names) { match = searchMenus(snapshot.entries, name); if (match) break; }
      const isTemplate = item.type === "spell" && !!item.system?.area?.value && !!item.system?.area?.type;
      if (match && isTemplate && ["range", "melee", "ontoken"].includes(match.menu)) {
        match = searchMenus(snapshot.menus.templatefx, item.name);
      } else if (!match && item.isVariant && item.original?.name) {
        match = searchMenus(snapshot.entries, item.original.name);
      }
      return match ? result("autorec", `Autorec · ${match.label} (${match.menu})`, {entryLabel: match.label})
        : result("missing", "No matching item override or Autorec entry.");
    } catch (error) { return result("unknown", `Status check failed: ${error.message}`); }
  }
  async openEditor(item) {
    const error = this.check();
    if (error) throw new Error(error);
    if (!item || item.isVariant || item.parentItem || item.actor?.items?.get(item.id) !== item) {
      throw new Error("No safely editable actor item. Use Autorec for temporary spells.");
    }
    // Invoke AA's registered control on the real sheet. Its callback handles
    // migrations and opens the original Svelte editor. No guessed class imports.
    const sheet = item.sheet;
    const controls = [];
    this.hooks.callAll("getHeaderControlsApplicationV2", sheet, controls);
    const control = controls.find(entry => entry.class === "aaItemSettings" && typeof entry.onClick === "function");
    if (control) return await control.onClick.call(sheet);
    const buttons = [];
    this.hooks.callAll("getItemSheetHeaderButtons", sheet, buttons);
    const button = buttons.find(entry => entry.class === "aaItemSettings" && typeof entry.onclick === "function");
    if (button) return await button.onclick.call(sheet);
    throw new Error("AA editor control not found. Check the AA version or open the item sheet.");
  }
  openAutorec() {
    const error = this.check();
    if (error) throw new Error(error);
    this.hooks.callAll("AutomaticAnimations.Open.Menu.New");
  }
}
