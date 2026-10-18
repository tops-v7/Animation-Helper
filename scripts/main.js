import {SceneAnimationManager} from "./manager.js";
const ID = "pf2e-scene-animation-manager";
let manager;
export function openManager() {
  if (!game.user.isGM) return ui.notifications.warn("Nur für den GM verfügbar.");
  manager ??= new SceneAnimationManager();
  return manager.render({force: true});
}
Hooks.once("init", () => {
  game.keybindings.register(ID, "open", {name: "Scene Animation Manager öffnen", restricted: true, editable: [],
    onDown: () => { openManager(); return true; }});
});
Hooks.once("ready", () => {
  game.modules.get(ID).api = Object.freeze({open: openManager});
});
Hooks.on("getSceneControlButtons", controls => {
  if (!game.user.isGM || game.system.id !== "pf2e" || !controls.tokens?.tools) return;
  controls.tokens.tools[ID] = {name: ID, title: "Scene Animation Manager", icon: "fa-solid fa-wand-magic-sparkles",
    order: Object.keys(controls.tokens.tools).length, button: true, visible: true, onChange: openManager};
});
