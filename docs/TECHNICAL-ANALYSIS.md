# Technischer Bericht und Implementierungsplan

Analyse vom 18. Oktober 2026. Ergebnis: **Variante 1 ist ohne Fork realisierbar.** AA stellt die globale Konfiguration bereit und registriert Item-Editor-Controls. Ein eigener Inline-Editor würde wesentlich stärker von privaten Schema- und Migrationsdetails abhängen und wird deshalb zurückgestellt.

## Tatsächlich untersuchte Versionen

| Komponente | Beobachtung | Beleg |
| --- | --- | --- |
| AA | GitHub-Release 7.1.8; Release-Manifest Minimum/Verified/Maximum 14. Das `module.json` im Quellbaum nennt noch 7.0.0. | [Release-Manifest](https://github.com/theripper93/autoanimations/releases/download/7.1.8/module.json) |
| AA-Quellcode | Tag 7.1.8 und HEAD auf Commit `58f9db81db0ea81f317333e44135b820a34a2a1a` | [Quellbaum](https://github.com/theripper93/autoanimations/tree/58f9db81db0ea81f317333e44135b820a34a2a1a) |
| PF2e | Default-Branch `v14-dev`, Commit `ee72eab1b02094676e1b66495f79ce87b99d999c`; Manifest 8.6.1, Minimum 14.361, Verified 14.369 | [Manifest](https://github.com/foundryvtt/pf2e/blob/ee72eab1b02094676e1b66495f79ce87b99d999c/system.pf2e.json) |
| Sequencer | Release 4.3.0, Minimum 13, Verified/Maximum 14. Der Master-Quellbaum nennt bereits 10.0.0 und ist kein verlässlicher Release-Pin. | [Release-Manifest](https://github.com/fantasycalendar/FoundryVTT-Sequencer/releases/download/4.3.0/module.json) |
| JB2A Free | Release/Quellmanifest 0.9.4, Minimum 10, Verified 14 | [Repository](https://github.com/Jules-Bens-Aa/JB2A_DnD5e) |

PF2es GitHub-`latest` verweist aktuell auf ein SF2e-Release; für PF2e wurde deshalb das tatsächliche PF2e-Manifest ausgewertet. Kein Foundry-Runtime-Test: Die Foundry-Versionsangaben stammen aus den Manifesten und mitgelieferten Typen, nicht aus einem lokal gestarteten Server. Die Quellen liegen für die aktuelle Analyse unter `/tmp/aa-reference` und `/tmp/pf2e-reference`; diese temporären Pfade sind keine Laufzeitabhängigkeit des Moduls.

## Bereits vorhandene AA-Funktionen

### Speicherung und Auflösung

- Itemkonfiguration: `item.flags.autoanimations`. Aktuelle Flag-Schemaversion ist **5** (`flagMigrations.migrations`), unabhängig von der Modulversion 7.x.
- `isEnabled: false` bzw. historisch `killAnim` deaktivieren. `isCustomized: true` aktiviert den individuellen Override; das bloße Vorhandensein von Flags ist kein Override.
- Kategorie über `menu`, beispielsweise `range`, `melee`, `templatefx` oder `preset`; Unterdaten unter anderem in `primary.video`, `primary.sound` und weiteren kategorieabhängigen Strukturen.
- Globales Autorec: getrennte World-Settings `aaAutorec-melee`, `-range`, `-ontoken`, `-templatefx`, `-aura`, `-preset`, `-aefx`. `aaAutorec` enthält Metadaten/Version. `disableAutoRec` ist ein eigener Schalter.
- Die öffentlich exportierte Klasse `window.AutomatedAnimations.AutorecManager` bietet `getAutorecEntries()`, außerdem Merge/Overwrite/Export. Der Manager verwendet ausschließlich den lesenden Getter.
- Der tatsächliche Resolver `handleItem()` in `src/system-handlers/findAnimation.js` ist **nicht öffentlich exportiert**. Er ruft Flag-Migrationen auf, die `item.update()` ausführen können. Daher wird er nicht für eine passive Übersicht importiert oder aufgerufen.

Belege: [Resolver](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/system-handlers/findAnimation.js), [Suchregeln](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/aa-classes/aaAutorecFunctions.js), [Flag-Migrationen](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/mergeScripts/items/itemFlagMerge.js), [AutorecManager](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/formApps/_AutorecMenu/components/category/menuManager/AAAutorecManager.js).

Die gekapselte Projektion reproduziert: Priorität individueller Overrides, exakte case-sensitive Labels vor unscharfen Treffern, Entfernung von Leerraum und Kleinschreibung nur für unscharfe Suche, längstes Label zuerst, `advanced.excludedTerms`, Waffen-Basistyp/-Gruppe, Varianten-Basisname und Template-Kategorieeinschränkung. Active-Effect-Autorec wird nicht in die normale Itemsuche gemischt. Kontextabhängige Ammunition, externe `overrideNames`, Roll- und Trefferbedingungen sind außerhalb dieser statischen Übersicht.

Alte Flags werden nicht eigenständig migriert. Der Status **Ungeklärt** verhindert, dass eine mögliche Altkonfiguration als fehlend behandelt wird. Ein Treffer ist ein Konfigurationsnachweis, kein Funktionsnachweis für ein Asset.

### Originalen Editor öffnen

`src/index.js::registerAAItemHooks()` registriert:

1. `getHeaderControlsApplicationV2`: Kontrolle mit `class: "aaItemSettings"` und `onClick`.
2. `getItemSheetHeaderButtons`: Legacy-Kontrolle derselben Klasse mit `onclick`.

Der Callback führt AAs eigene `flagMigrations.handle(document)` aus und erstellt `ItemMenuApp(document, {}).render(true, {focus: true})`. Die Klasse selbst wird nicht als öffentliche API angeboten und steckt im gebauten Bundle; ein Import aus `modules/autoanimations/src/...` wäre nicht zuverlässig.

Der Adapter lässt daher am **echten Item-Sheet** die registrierten Controls über Foundrys Hook-System sammeln, wählt ausschließlich das AA-Control und ruft dessen Originalcallback auf. Kein geratenes API, kein Fake-Item, kein eigener Schreibpfad. Der Callback ist ein internes Integrationsdetail und muss bei AA-Updates geprüft werden. Bei fehlendem Control bricht der Adapter mit einer verständlichen Meldung ab. Der öffentliche Hook `AutomaticAnimations.Open.Menu.New` öffnet AAs globalen Autorec-Editor.

Belege: [Registrierung und Exports](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/index.js), [ItemMenuApp](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/formApps/_ItemMenu/ItemMenuApp.js).

### PF2e-Anbindung

AA hört in `aa-pf2e.js` auf `createChatMessage` und `createRegion`. Es erhält unter anderem `msg.item`, PF2e-Origin-UUID, Token und Actor; Varianten liefern `isVariant` und `original`. Waffen ergänzen lokalisierte Basistyp-/Gruppennamen. Dadurch kann eine benutzerdefiniert benannte Waffe trotzdem einen globalen Treffer haben.

PF2e 8.6.1 stellt bereit:

- `actor.items` mit `spell`, `weapon`, `melee`, `action`, `feat`; `system.actionType.value` unterscheidet aktive Feats, Reaktionen und freie Aktionen von passiven Einträgen.
- `actor.spellcasting.collections` als Map zugänglicher `SpellCollection`s, einschließlich vorbereiteter bzw. von anderen Modulen zugänglich gemachter Listen. Quellenname über `collection.entry.name` bzw. `actor.spellcasting.get(locationId)`.
- `actor.system.actions[*].item` für vorbereitete Strikes; synthetische Angriffe können ohne persistiertes Actor-Item existieren.
- `spell.overlays.overrideVariants` erzeugt die geladenen Varianten; `variantId` unterscheidet sie, obwohl die UUID zum Basiszauber zurückverweist.
- `consumable.embeddedSpell` liefert einen temporären Zauber mit `parentItem`.
- Varianten-`update()` leitet nur bei gerendertem Variantensheet an `original.overlays.updateOverride()` weiter. Ein externer Editor darf deshalb nicht bedenkenlos beliebige Variantenobjekte aktualisieren.

Belege: [AA PF2e](https://github.com/theripper93/autoanimations/blob/58f9db81db0ea81f317333e44135b820a34a2a1a/src/system-support/aa-pf2e.js), [Spellcasting](https://github.com/foundryvtt/pf2e/blob/ee72eab1b02094676e1b66495f79ce87b99d999c/src/module/actor/spellcasting.ts), [Spell-Dokument](https://github.com/foundryvtt/pf2e/blob/ee72eab1b02094676e1b66495f79ce87b99d999c/src/module/item/spell/document.ts), [Overlays](https://github.com/foundryvtt/pf2e/blob/ee72eab1b02094676e1b66495f79ce87b99d999c/src/module/item/spell/overlay.ts), [Consumables](https://github.com/foundryvtt/pf2e/blob/ee72eab1b02094676e1b66495f79ce87b99d999c/src/module/item/consumable/document.ts).

Für Foundry 14 wurden ApplicationV2-Lebenszyklusmethoden und das Objektformat der Scene Controls anhand der im PF2e-Quellbaum enthaltenen Foundry-Typen und `src/scripts/hooks/get-scene-control-buttons.ts` geprüft. Der Button verwendet `controls.tokens.tools[id]` und `onChange`, kein veraltetes Arrayformat.

## Risiken aus den genannten Issues

Alle vier Issue-Seiten wurden gelesen; sie beschreiben Playback-/Persistenzgrenzen und sind keine zusätzlichen Schreib-APIs:

- [#74 Varianten](https://github.com/theripper93/autoanimations/issues/74): Editor kann Basiszauber statt individueller Variante ändern. Prototyp kennzeichnet dies ausdrücklich und übergibt den Basiszauber.
- [#84 Dailies/Stäbe](https://github.com/theripper93/autoanimations/issues/84): Zugänglicher Zauber bzw. Treffer garantiert nicht, dass AA beim Cast den passenden Chat-/Origin-Kontext erhält. Temporäre Zauber nur lesend, Autorec als Konfigurationsweg.
- [#82 Regionen](https://github.com/theripper93/autoanimations/issues/82): Persistente Animationen können nach Region-Löschung bestehen bleiben. Der Manager erstellt/löscht keine Animationen oder Regionen.
- [#85 Sequencer](https://github.com/theripper93/autoanimations/issues/85): Source-/Secondary-Effekte und Foundry-Levels/Elevation. Der Thread berichtet eine Korrektur in AA 7.1.8. Das wurde hier nicht als Playback-Test reproduziert.

## Konkreter Plan und Umsetzung der ersten Version

1. **Datenzugriff:** aktive Canvas-Szene lesen, linked Actors anhand Actor-UUID deduplizieren; unlinked Tokens anhand Token-UUID separat halten. Actorlose Tokens zählen/überspringen. Relevante Items, vorbereitete Strikes und Spellcasting-Collections sammeln. **Implementiert in `scripts/pf2e-data.js`.**
2. **AA-Adapter:** genau eine Kompatibilitätsgrenze für Autorec-Lesen, Statusprojektion, Editor-Control und globalen Menü-Hook. Fehler/Altdaten als ungeklärt behandeln. Bearbeitung nur bei identischem persistierten Actor-Item. **Implementiert in `scripts/aa-adapter.js`.**
3. **GM-Oberfläche:** ApplicationV2 mit Szenenübersicht, gruppierter Actor-Auswahl, Such-/Status-/Kategorie-Filter, Details und AA-Buttons. Keine direkte Datenmutation. **Implementiert in `scripts/manager.js`, Einstieg in `scripts/main.js`.**
4. **Aktualisierung:** Document-, Canvas- und Setting-Hooks gebündelt behandeln; beim Schließen alle Listener entfernen. Vor Editoröffnung aktuelle Szenenzugehörigkeit und Itemidentität erneut prüfen. **Implementiert.**
5. **Validierung und Paket:** automatisierte Projektions-/Adapter-/DOM-Tests, Vergleich gegen den echten AA-Resolver, sauberes ZIP. **In der Cloud geprüft.**
6. **Foundry-Abnahme:** in separater lizenzierter Testwelt Installation, echten Svelte-Editor, synthetische Itemupdates und Multi-Client-Aktualisierung prüfen. **Offen**, siehe `TESTING.md`. Erst nach dieser Abnahme Produktionsreife oder vollständige V14-Verifizierung behaupten.

Die kleinen Verwaltungsverbesserungen aus Phase 3 (Gesamtübersicht, Fehlend-Filter, automatische Updates, Variantenanzeige) sind im Prototyp enthalten, aber nicht als bereits in Foundry abgenommene Phase zu verstehen. Phase 4 bleibt zurückgestellt.

## Zukünftige Erweiterungen

- Unabhängige Variantenpersistenz erst mit nachgewiesenem AA-/PF2e-Pfad und realen Tests für Overlay-Diffs, Löschoperationen und Schließen des Variantensheets.
- Inline-Editor nur mit stabilem AA-Schema/API; kein zweiter Store für globale Zuordnungen.
- Explizite optionale Integrationen für Dailies und andere dynamische Quellen, jeweils mit deren tatsächlichen APIs und Persistenzregeln.
- Batchoperationen erst mit konkretem Änderungsreview und Tests für linked/unlinked Actors; keine impliziten Schreiboperationen beim Scannen.
- Bei AA-Updates `aaItemSettings`, Callbacknamen, Autorec-Schema, Flagversion und `findAnimation` erneut vergleichen. AA 8+ wird bis dahin ausdrücklich abgewiesen.
