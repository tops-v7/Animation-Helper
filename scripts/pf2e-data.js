/** Read-only PF2e projection. Documents are retained, never cloned for editing. */
export const values = (collection) => collection?.contents ?? (collection?.values ? [...collection.values()] : Array.isArray(collection) ? collection : []);

export function sceneActors(scene) {
  const groups = new Map();
  let missing = 0;
  for (const token of values(scene?.tokens)) {
    const actor = token.actor;
    if (!actor) { missing++; continue; }
    if (!["character", "npc"].includes(actor.type)) continue;
    // Linked tokens share a world actor; every unlinked token has independent data.
    const key = token.actorLink ? actor.uuid : token.uuid;
    const existing = groups.get(key);
    if (existing) { existing.tokens.push(token); continue; }
    groups.set(key, {key, actor, tokens: [token], type: actor.type,
      name: token.actorLink ? actor.name : `${token.name} (${actor.name})`});
  }
  return {actors: [...groups.values()].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)), missing};
}

export function actorAbilities(actor) {
  const rows = new Map();
  const warnings = [];
  const persisted = new Set(values(actor.items));
  const add = (item, {source = "Item", key, editItem = item, note = ""} = {}) => {
    if (!item) return;
    const type = item.type;
    const category = type === "spell" ? "spell" : ["weapon", "melee"].includes(type) ? "attack" : "action";
    if (!["spell", "weapon", "melee", "action", "feat", "consumable"].includes(type)) return;
    if (type === "feat" && !["action", "reaction", "free"].includes(item.system?.actionType?.value)) return;
    if (type === "consumable") return; // Embedded spell is collected separately.
    const rowKey = key ?? item.uuid ?? `${type}:${item.id}:${item.name}`;
    if (rows.has(rowKey)) return;
    const canEdit = persisted.has(editItem) && !editItem.isVariant && !editItem.parentItem;
    rows.set(rowKey, {key: rowKey, item, editItem: canEdit ? editItem : null,
      name: item.name, category, source, note: note || (canEdit ? "" : "Temporary item: status only; safe persistent editing is not available.")});
    if (type === "spell" && !item.isVariant) {
      try {
        for (const variant of item.overlays?.overrideVariants ?? []) {
          add(variant, {key: `${rowKey}:variant:${variant.variantId}`, editItem: item,
            source: `${source} · Variant`, note: "The AA editor edits the base spell. Variant status is checked separately."});
        }
      } catch (error) { warnings.push(`Variants of ${item.name}: ${error.message}`); }
    }
  };
  for (const item of persisted) {
    const entry = item.type === "spell" ? actor.spellcasting?.get?.(item.system?.location?.value) : null;
    add(item, {source: entry?.name ?? "Item"});
    if (item.type === "consumable") {
      try {
        if (item.embeddedSpell) add(item.embeddedSpell, {key: `${item.uuid}:embeddedSpell`, editItem: null,
          source: item.name, note: "Embedded consumable spell: status only; use Autorec."});
      } catch (error) { warnings.push(`${item.name}: ${error.message}`); }
    }
  }
  // Prepared spell collections also include accessible module-generated lists (e.g. staves).
  for (const collection of values(actor.spellcasting?.collections)) {
    for (const spell of values(collection)) add(spell, {source: collection.entry?.name ?? "Spell collection"});
  }
  for (const strike of actor.system?.actions ?? []) {
    if (!strike.item) continue;
    add(strike.item, {source: "Prepared strike"});
  }
  return {abilities: [...rows.values()].sort((a, b) => a.name.localeCompare(b.name)), warnings};
}

export function filterAbilities(rows, {query = "", category = "", status = ""} = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return rows.filter(row => (!needle || `${row.name} ${row.source}`.toLocaleLowerCase().includes(needle))
    && (!category || row.category === category) && (!status || row.status.kind === status));
}
export function summarize(rows) {
  const result = {total: rows.length, configured: 0, missing: 0, disabled: 0, unknown: 0};
  for (const row of rows) {
    if (["item", "autorec"].includes(row.status.kind)) result.configured++;
    else if (row.status.kind in result) result[row.status.kind]++;
  }
  return result;
}
