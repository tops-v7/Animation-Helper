# PF2E Scene Animation Manager: technical analysis and implementation plan

Analysis performed on October 18, 2026. **Approach 1, opening AA's existing editor, is feasible without a fork.** AA exposes global configuration data and registers item editor controls. An inline editor would depend more heavily on private schemas and migration behavior, so it is deferred.

The displayed module name is **PF2E Scene Animation Manager**. The technical ID `pf2e-scene-animation-manager` is retained for compatibility with existing installations, settings, and API consumers.

## Versions investigated

| Component | Observation | Reference |
| --- | --- | --- |
| AA | GitHub release 7.1.8; its release manifest declares minimum/verified/maximum Foundry 14. The source tree's `module.json` still reports 7.0.0. | [Release manifest](https://github.com/theripper93/autoanimations/releases/download/7.1.8/module.json) |
| AA source | Tag 7.1.8 and HEAD at commit `58f9db81db0ea81f317333e44135b820a34a2a1a` | [Source tree](https://github.com/theripper93/autoanimations/tree/58f9db81db0ea81f317333e44135b820a34a2a1a) |
| PF2e | Default branch `v14-dev`, commit `ee72eab1b02094676e1b66495f79ce87b99d999c`; manifest 8.6.1, minimum 14.361, verified 14.369 | [Manifest](https://github.com/foundryvtt/pf2e/blob/ee72eab1b02094676e1b66495f79ce87b99d999c/system.pf2e.json) |
| Sequencer | Release 4.3.0, minimum 13, verified/maximum 14. The master source tree already reports 10.0.0 and does not represent the current release. | [Release manifest](https://github.com/fantasycalendar/FoundryVTT-Sequencer/releases/download/4.3.0/module.json) |
| JB2A Free | Release/source manifest 0.9.4, minimum 10, verified 14 | [Repository](https://github.com/Jules-Bens-Aa/JB2A_DnD5e) |

PF2e's GitHub `latest` endpoint pointed to an SF2e release during the analysis, so the actual PF2e manifest was inspected. These Foundry version observations come from manifests and bundled types, not a locally running server. Reference sources were checked out at `/tmp/aa-reference` and `/tmp/pf2e-reference`; neither temporary path is a runtime dependency.

## Existing AA functionality

### Storage and resolution

- Item configuration is stored in `item.flags.autoanimations`. The current flag schema is **5** (`flagMigrations.migrations`), independently of AA's module version 7.x.
- `isEnabled: false`, or the historical `killAnim`, disables an item. `isCustomized: true` selects an individual override; the mere presence of flags does not indicate an override.
- `menu` identifies categories such as `range`, `melee`, `templatefx`, or `preset`. Category-specific structures include `primary.video`, `primary.sound`, and other fields.
- Global Autorec uses separate world settings: `aaAutorec-melee`, `-range`, `-ontoken`, `-templatefx`, `-aura`, `-preset`, and `-aefx`. `aaAutorec` contains metadata/version information. `disableAutoRec` is a separate switch.
- The public `window.AutomatedAnimations.AutorecManager` class exposes `getAutorecEntries()`, plus merge, overwrite, and export operations. PF2E Scene Animation Manager uses only its read-only getter.
- The actual `handleItem()` resolver in `src/system-handlers/findAnimation.js` is **not exposed as a public API**. It runs flag migrations that may call `item.update()`, so the passive overview does not import or call it.

References: [Resolver](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/system-handlers/findAnimation.js), [matching rules](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/aa-classes/aaAutorecFunctions.js), [flag migrations](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/mergeScripts/items/itemFlagMerge.js), [AutorecManager](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/formApps/_AutorecMenu/components/category/menuManager/AAAutorecManager.js).

The isolated adapter reproduces individual override precedence, case-sensitive exact labels before partial matches, whitespace removal and lowercasing for partial matches, longest-label ordering, `advanced.excludedTerms`, weapon base type/group fallback, variant base-name fallback, and template category restrictions. Active-effect Autorec is excluded from regular item searches. Context-specific ammunition, external `overrideNames`, roll conditions, and hit conditions are outside this static overview.

Older flags are not migrated by PF2E Scene Animation Manager. **Unknown** prevents a potentially valid older configuration from being reported as missing. A match demonstrates an assignment, not working asset playback.

### Opening the original editor

`src/index.js::registerAAItemHooks()` registers:

1. `getHeaderControlsApplicationV2`: a control with `class: "aaItemSettings"` and `onClick`.
2. `getItemSheetHeaderButtons`: a legacy control with the same class and `onclick`.

The callback runs AA's `flagMigrations.handle(document)` and constructs `ItemMenuApp(document, {}).render(true, {focus: true})`. The class is not exposed as a public API and lives inside the built bundle. Importing `modules/autoanimations/src/...` would be unreliable.

The adapter collects the registered controls through Foundry's hooks using the **real item sheet**, selects AA's control, and invokes its original callback. It does not create a fake item or implement a separate write path. The control identifier and callback are internal integration details that must be checked after AA updates. A missing control produces a clear error. The public `AutomaticAnimations.Open.Menu.New` hook opens AA's global Autorec editor.

References: [Registration and exports](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/index.js), [ItemMenuApp](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/formApps/_ItemMenu/ItemMenuApp.js).

### PF2e integration

AA's `aa-pf2e.js` listens to `createChatMessage` and `createRegion`. It receives `msg.item`, PF2e origin UUIDs, tokens, and actors; variants provide `isVariant` and `original`. Weapons add localized base-type and group names, allowing custom-named weapons to match global entries.

PF2e 8.6.1 provides:

- `actor.items` with `spell`, `weapon`, `melee`, `action`, and `feat` items. `system.actionType.value` distinguishes active feats, reactions, and free actions from passive entries.
- `actor.spellcasting.collections`, a map of accessible `SpellCollection` instances, including prepared lists and lists exposed by other modules. Source names come from `collection.entry.name` or `actor.spellcasting.get(locationId)`.
- `actor.system.actions[*].item` for prepared strikes. Synthetic attacks may lack a persistent actor item.
- `spell.overlays.overrideVariants` for loaded variants. `variantId` distinguishes variants even though their UUID refers to the base spell.
- `consumable.embeddedSpell`, a temporary spell with `parentItem`.
- Variant `update()` redirects to `original.overlays.updateOverride()` only when the variant sheet is rendered. An external editor therefore cannot safely update arbitrary variant objects without further validation.

References: [AA PF2e](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/system-support/aa-pf2e.js), [spellcasting](https://github.com/foundryvtt/pf2e/blob/ee72eab1b02094676e1b66495f79ce87b99d999c/src/module/actor/spellcasting.ts), [spell document](https://github.com/foundryvtt/pf2e/blob/ee72eab1b02094676e1b66495f79ce87b99d999c/src/module/item/spell/document.ts), [overlays](https://github.com/foundryvtt/pf2e/blob/ee72eab1b02094676e1b66495f79ce87b99d999c/src/module/item/spell/overlay.ts), [consumables](https://github.com/foundryvtt/pf2e/blob/ee72eab1b02094676e1b66495f79ce87b99d999c/src/module/item/consumable/document.ts).

Foundry 14 ApplicationV2 lifecycle methods and the scene-controls object format were checked against Foundry types bundled with PF2e and `src/scripts/hooks/get-scene-control-buttons.ts`. The tool uses `controls.tokens.tools[id]` and `onChange`, rather than the older array format.

## Risks identified in the referenced issues

All four issue pages were reviewed. They describe playback or persistence limitations, not additional write APIs:

- [#74: variants](https://github.com/theripper93/autoanimations/issues/74): the editor may modify the base spell instead of an individual variant. PF2E Scene Animation Manager explicitly labels this behavior and passes the base spell.
- [#84: Dailies/staves](https://github.com/theripper93/autoanimations/issues/84): an accessible spell or matching assignment does not guarantee that AA receives the correct chat/origin context when casting. Temporary spells are read-only; use Autorec for configuration.
- [#82: regions](https://github.com/theripper93/autoanimations/issues/82): persistent animations may survive region deletion. PF2E Scene Animation Manager creates or deletes neither animations nor regions.
- [#85: Sequencer](https://github.com/theripper93/autoanimations/issues/85): source/secondary effects and Foundry levels/elevation. The thread reports a correction in AA 7.1.8; no playback reproduction was performed here.

## First-version implementation plan and status

1. **Data access:** read the current canvas scene; deduplicate linked actors by actor UUID; keep unlinked tokens separate by token UUID; count/skip tokens without actors; collect relevant items, prepared strikes, and spellcasting collections. **Implemented in `scripts/pf2e-data.js`.**
2. **AA adapter:** keep Autorec reading, status projection, editor controls, and the global menu hook behind one compatibility boundary. Treat errors/older data as unknown. Edit only the identical persistent actor item. **Implemented in `scripts/aa-adapter.js`.**
3. **GM interface:** ApplicationV2 with scene summary, grouped actor selection, search/status/category filters, details, and AA buttons. No direct data mutation. **Implemented in `scripts/manager.js`, with entry points in `scripts/main.js`.**
4. **Refresh:** batch document, canvas, and setting hooks; remove listeners when closing; recheck current scene membership and item identity before opening the editor. **Implemented.**
5. **Validation and packaging:** automated projection/adapter/DOM tests, comparisons against AA's actual resolver, and a clean ZIP. **Validated in the cloud.**
6. **Foundry acceptance:** test installation, the actual Svelte editor, synthetic item updates, and multi-client refresh in a separate licensed test world. **Pending**; see `TESTING.md`. Production readiness and full V14 verification depend on this acceptance test.

The prototype includes the smaller phase 3 management improvements: scene summary, missing-assignment filter, automatic refresh, and variant listing. Their inclusion does not imply completed Foundry acceptance. Phase 4 remains deferred.

## Future extensions

- Independent variant persistence requires a proven AA/PF2e path and real tests for overlay diffs, deletion operations, and closing variant sheets.
- Inline editing requires a stable AA schema/API; global assignments should remain in AA's store.
- Optional integrations for Dailies and other dynamic sources must use their actual APIs and persistence rules.
- Batch operations require concrete change review and tests for linked/unlinked actors. Scanning must remain read-only.
- After AA updates, recheck `aaItemSettings`, callback names, Autorec schemas, flag versions, and `findAnimation`. AA 8+ is rejected until the adapter is reviewed.
