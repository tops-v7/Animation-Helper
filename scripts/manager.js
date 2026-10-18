import {AAAdapter} from "./aa-adapter.js";
import {sceneActors, actorAbilities, filterAbilities, summarize} from "./pf2e-data.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
const option = (value, label, current) => `<option value="${escape(value)}" ${value === current ? "selected" : ""}>${escape(label)}</option>`;
const watchHooks = ["canvasReady", "canvasTearDown", "createToken", "updateToken", "deleteToken", "createActor", "updateActor", "deleteActor", "createItem", "updateItem", "deleteItem", "updateSetting", "closeApplication", "closeApplicationV2"];

export class SceneAnimationManager extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "pf2e-scene-animation-manager", tag: "section", classes: ["pf2e-sam"],
    position: {width: 1000, height: 740}, window: {title: "PF2E Scene Animation Manager", resizable: true}
  };
  constructor(options = {}) {
    super(options);
    this.adapter = new AAAdapter();
    this.filters = {query: "", category: "", status: ""};
    this.actorKey = "";
    this.abilityKey = "";
    this.subscriptions = [];
  }
  _canRender() { return !!game.user.isGM; }
  async _renderHTML() {
    const error = this.adapter.check();
    const root = document.createElement("div");
    root.className = "sam-body";
    if (error) {
      root.innerHTML = `<p role="alert">${escape(error)}</p>`;
      return root;
    }
    const scene = canvas.ready ? canvas.scene : null;
    const data = sceneActors(scene);
    const snapshot = this.adapter.snapshot();
    this.projections = data.actors.map(group => {
      const projection = actorAbilities(group.actor);
      const rows = projection.abilities.map(row => ({...row, status: this.adapter.status(row.item, snapshot)}));
      return {...group, rows, warnings: projection.warnings, summary: summarize(rows)};
    });
    const current = this.projections.find(group => group.key === this.actorKey) ?? this.projections[0];
    this.actorKey = current?.key ?? "";
    const filtered = filterAbilities(current?.rows ?? [], this.filters);
    const ability = filtered.find(row => row.key === this.abilityKey) ?? filtered[0];
    this.abilityKey = ability?.key ?? "";
    const count = type => this.projections.filter(group => group.type === type).length;
    root.innerHTML = `
      <header class="sam-heading"><div><h2>${escape(scene?.name ?? "No canvas scene open")}</h2>
      <p>${count("character")} PCs · ${count("npc")} NPCs · ${scene?.tokens?.size ?? 0} Tokens</p></div>
      <button type="button" data-action="refresh"><i class="fa-solid fa-rotate" aria-hidden="true"></i> Refresh</button></header>
      ${data.missing ? `<p role="status">${data.missing} tokens without an actor skipped.</p>` : ""}
      ${snapshot.error ? `<p role="alert">${escape(snapshot.error)}</p>` : ""}
      <details class="sam-summary" open><summary>Scene overview</summary>
        <div class="sam-table-scroll"><table><thead><tr><th>Character</th><th>Abilities</th><th>Configured</th><th>Missing</th><th>Disabled</th><th>Unknown</th></tr></thead>
        <tbody>${this.projections.map(group => `<tr><td><button type="button" data-actor="${escape(group.key)}">${escape(group.name)}${group.tokens.length > 1 ? ` ×${group.tokens.length}` : ""}</button></td>
        ${["total", "configured", "missing", "disabled", "unknown"].map(key => `<td>${group.summary[key]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      </details>
      <label>Character <select name="actor" ${current ? "" : "disabled"}>
        ${["character", "npc"].map(type => `<optgroup label="${type === "character" ? "PCs" : "NPCs"}">${this.projections.filter(group => group.type === type).map(group => option(group.key, `${group.name}${group.tokens.length > 1 ? ` ×${group.tokens.length}` : ""}`, this.actorKey)).join("")}</optgroup>`).join("")}
      </select></label>
      <div class="sam-filters">
        <label>Search <input type="search" name="query" value="${escape(this.filters.query)}" placeholder="Name or spellcasting entry"></label>
        <label>Category <select name="category">${[["", "All"], ["spell", "Spells"], ["attack", "Attacks"], ["action", "Actions / Reactions"]].map(([v,l]) => option(v,l,this.filters.category)).join("")}</select></label>
        <label>Status <select name="status">${[["", "All"], ["missing", "Missing animations"], ["item", "Item override"], ["autorec", "Autorec"], ["disabled", "Disabled"], ["unknown", "Unknown"]].map(([v,l]) => option(v,l,this.filters.status)).join("")}</select></label>
      </div>
      <div class="sam-columns"><section aria-label="Abilities"><p>${filtered.length} of ${current?.rows.length ?? 0} abilities</p>
        <ul class="sam-abilities">${filtered.map(row => `<li><button type="button" data-ability="${escape(row.key)}" aria-pressed="${row.key === this.abilityKey}">
        <span>${escape(row.name)}<small>${escape(row.source)}</small></span><span class="sam-status ${row.status.kind}">${escape(row.status.label)}</span></button></li>`).join("")}</ul>
        ${!filtered.length ? "<p>No matching abilities found.</p>" : ""}
      </section><section class="sam-detail" aria-label="Animation management">
        ${ability ? `<h3>${escape(ability.name)}</h3><p class="sam-status ${ability.status.kind}">${escape(ability.status.label)}</p>
        <p>${escape(ability.status.detail)}</p><p>${escape(ability.note)}</p>
        <button type="button" data-action="editor" ${ability.editItem ? "" : "disabled"}>Open AA configuration${ability.item.isVariant ? " (base spell)" : ""}</button>` : "<p>Select an ability.</p>"}
        <button type="button" data-action="autorec">Open global AA Autorec</button>
        <p class="sam-hint">“Configured” means a matching assignment was found. Assets, roll context, and actual playback are not checked. Variants count as separate entries.</p>
      </section></div>
      ${(current?.warnings ?? []).map(w => `<p role="alert">${escape(w)}</p>`).join("")}`;
    return root;
  }
  _replaceHTML(result, content) {
    const focused = content.querySelector("input[name=query]");
    const restoreFocus = focused === document.activeElement;
    const position = focused?.selectionStart;
    content.replaceChildren(result);
    result.addEventListener("change", event => {
      const {name, value} = event.target;
      if (name === "actor") { this.actorKey = value; this.abilityKey = ""; }
      else if (["category", "status"].includes(name)) this.filters[name] = value;
      else return;
      this.render({force: true});
    });
    result.addEventListener("input", event => {
      if (event.target.name !== "query") return;
      this.filters.query = event.target.value;
      this.queueRefresh();
    });
    result.addEventListener("click", event => {
      const target = event.target.closest("button");
      if (!target || target.disabled) return;
      if (target.dataset.actor) { this.actorKey = target.dataset.actor; this.abilityKey = ""; }
      else if (target.dataset.ability) this.abilityKey = target.dataset.ability;
      else if (target.dataset.action === "editor") {
        const ability = this.projections.find(g => g.key === this.actorKey)?.rows.find(r => r.key === this.abilityKey);
        // Re-project before handing a document to AA: deleted or replaced items must not be edited.
        const active = sceneActors(canvas.ready ? canvas.scene : null).actors.find(group => group.key === this.actorKey);
        const live = ability?.editItem && active?.actor.items?.get(ability.editItem.id);
        if (!live || live !== ability?.editItem) { ui.notifications.warn("The item has changed. Please select it again."); this.render({force: true}); return; }
        this.adapter.openEditor(live).catch(error => ui.notifications.error(error.message));
        return;
      } else if (target.dataset.action === "autorec") {
        try { this.adapter.openAutorec(); } catch (error) { ui.notifications.error(error.message); }
        return;
      } else if (target.dataset.action !== "refresh") return;
      this.render({force: true});
    });
    if (restoreFocus) {
      const input = content.querySelector("input[name=query]");
      input?.focus();
      input?.setSelectionRange(position, position);
    }
  }
  _onRender() {
    if (this.subscriptions.length) return;
    for (const name of watchHooks) {
      this.subscriptions.push([name, Hooks.on(name, document => {
        if (name === "updateSetting" && !document.key?.startsWith("autoanimations.")) return;
        // Ignore our own close; refresh only while this manager is open.
        if (document === this) return;
        this.queueRefresh();
      })]);
    }
  }
  queueRefresh() {
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      if (this.rendered) this.render({force: true});
    }, 180);
  }
  _onClose() {
    clearTimeout(this.refreshTimer);
    for (const [name, id] of this.subscriptions) Hooks.off(name, id);
    this.subscriptions = [];
  }
}
