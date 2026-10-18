# Animation Helper

An installable **0.1.1 prototype** for Foundry VTT 14 and Pathfinder Second Edition. Animation Helper gives the GM a central overview of Automated Animations assignments for the current canvas scene. It uses AA's existing configuration and editor without maintaining a separate assignment database or rendering animations itself.

## Installation

In Foundry, open **Add-on Modules → Install Module → Manifest URL** and enter:

```text
https://raw.githubusercontent.com/tops-v7/Animation-Helper/main/module.json
```

The manifest downloads the versioned GitHub source archive for tag `v0.1.1`. No JavaScript build or `node_modules` installation is required in Foundry.

For manual installation:

1. Build the ZIP with `npm run build`: `dist/pf2e-scene-animation-manager-0.1.1.zip`.
2. Extract it into your Foundry user data directory, under `Data/modules/`. The manifest must be at `Data/modules/pf2e-scene-animation-manager/module.json`.
3. Restart Foundry. In a separate PF2e test world, enable Automated Animations, its dependencies (Sequencer and socketlib), and **Animation Helper**. Install suitable JB2A assets for playback.
4. Open a scene as GM and click the wand button labeled **Animation Helper** in the token tools.

You can also open the window from the console or a script macro:

```js
game.modules.get("pf2e-scene-animation-manager").api.open();
```

A configurable keyboard shortcut is available in Foundry's settings. The technical module ID remains `pf2e-scene-animation-manager` so existing installations, settings, and API calls remain compatible. The displayed name is **Animation Helper**.

For future releases, update the manifest version and download tag together. The manifest URL remains unchanged.

## Requirements and validation status

- Foundry VTT **14** and PF2e **8.6.1 or later**, as declared in the module manifest.
- Automated Animations **7.x**; the integration was investigated against release **7.1.8** and its source.
- Sequencer enabled; the investigated release is **4.3.0**.
- Available JB2A assets depend on your installation. Animation Helper needs no assets for configuration management and does not verify playback.
- GM access only. No credentials or separate server services are required.

**Not yet validated in a running Foundry 14 test world.** The cloud environment contains no licensed Foundry runtime or campaign data. Manifest compatibility is declared rather than demonstrated by a runtime acceptance test, so `verified` is intentionally unset. Source analysis, automated data/adapter tests, and DOM interaction tests have been completed. Follow the manual [test plan](docs/TESTING.md) before using the module in a campaign.

## Features and usage

- Current canvas scene with PC/NPC counts and a per-actor summary.
- Linked tokens sharing an actor are grouped, with a token count. Unlinked tokens remain separate and use their own synthetic actors.
- Actor selection, search by ability or spellcasting entry name, category filters, and animation status filters.
- Weapons, NPC melee/ranged attacks (`melee` items), actions, reactions, free actions, and active feats. Passive feats, effects, and conditions are excluded from the ability list.
- Spells from actor items and prepared spellcasting collections, including focus spells, accessible dynamic spells, and spells embedded in consumables.
- Existing override spell variants appear as additional entries. The list does not expand every possible spell rank.
- **Open AA configuration** opens AA's original editor for the persistent actor item. For variants, the button explicitly says **base spell**.
- **Open global AA Autorec** opens AA's existing global configuration. Assignments are neither copied nor synchronized into a separate store.
- Automatic refresh after actor, item, token, canvas, and AA setting changes, and after editors close. Events are batched; search and filters are preserved.

| Status | Meaning |
| --- | --- |
| Item override | Current AA flags with `isCustomized` and a recognized category |
| Autorec | A match using AA's naming, category, and fallback rules |
| Disabled | Disabled on the item, or global automatic recognition is turned off |
| Missing | No matching override or Autorec entry |
| Unknown | Missing dependencies/data, older flags, or invalid configuration |

**Missing animations** includes only **Missing** entries. Configured = Item override + Autorec. Variants count as separate rows. Assignment detection does not guarantee playback: roll context, assets, hit conditions, ammunition overrides, Sequencer, and AA runtime errors can affect the result.

## Data safety and limitations

The overview does not write actor, token, item, or AA data and does not run AA migrations. Opening the original AA editor deliberately allows that editor to perform its normal flag migrations and save your changes. Scanning does not overwrite, import, or migrate existing assignments.

- Variant editing deliberately opens the base spell. Independent variant overrides are not supported (AA issue #74).
- Temporary, generated, and consumable-embedded spells are readable, but cannot be edited directly without a proven safe persistence path. Use Autorec instead. Abilities supplied by other modules appear only when exposed as items, strike items, or accessible spellcasting collections.
- Dailies/staff spells may fail to trigger AA despite having an assignment (issue #84). Animation Helper does not modify playback hooks.
- Region lifecycles and Sequencer elevation are unchanged (issues #82/#85).
- Older AA flags are shown as **Unknown**. Open the AA editor to review or migrate them. Invalid global data is not reported as a missing assignment.
- Non-English ability names still require matching Autorec entries. The manager follows AA's naming rules and does not translate campaign content.
- All module-provided interface text and documentation are in English. Actor names, item names, and localized PF2e labels retain their existing language.
- Scene data is projected synchronously; very large scenes may benefit from additional profiling.

## Development

Node.js >=22 and Python 3 are sufficient. The module has no bundled runtime dependencies and needs no JavaScript build. `linkedom` is a development dependency used for DOM tests.

```sh
cd /workspace/Animation-Helper
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm test
npm run build
```

Cloud tasks are already isolated: use the existing checkout and do not create another Git worktree unless explicitly requested.

Optional comparison against actual AA source, without running Foundry:

```sh
git clone --depth 1 --branch 7.1.8 https://github.com/theripper93/autoanimations.git /tmp/aa-reference
node tools/verify-aa.mjs /tmp/aa-reference
```

This comparison runs AA's original resolver and header registration in a controlled Node context, with migrations and editor rendering substituted. The original editor callback receives the unchanged item document. Building AA is not required to package Animation Helper.

See the [technical report and implementation plan](docs/TECHNICAL-ANALYSIS.md) for architecture and source references. Changes to AA editor controls or resolution rules belong in `scripts/aa-adapter.js`. Inline editing, batch operations, and independent variant persistence are future extensions.
