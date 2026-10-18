# PF2e Scene Animation Manager

Eigenständiger, installierbarer Prototyp **0.1.0** für Foundry VTT 14 und PF2e. Der GM verwaltet vorhandene Automated-Animations-Zuordnungen zentral für die geöffnete Canvas-Szene. Kein Fork, kein Renderer und keine eigene Konfigurationsdatenbank.

## Installation

1. Das ZIP `dist/pf2e-scene-animation-manager-0.1.0.zip` herunterladen oder mit `npm run build` erzeugen.
2. ZIP in das Foundry-UserData-Verzeichnis `Data/modules/` entpacken. Die Datei muss anschließend unter `Data/modules/pf2e-scene-animation-manager/module.json` liegen.
3. Foundry neu starten. In einer separaten PF2e-Testwelt Automated Animations, dessen Abhängigkeiten (Sequencer und socketlib) und dieses Modul aktivieren. Für Wiedergabe passende JB2A-Assets installieren.
4. Als GM eine Szene öffnen und in den Token-Werkzeugen den Zauberstab-Button **Scene Animation Manager** anklicken.

Alternativ über die Konsole bzw. ein Script-Makro:

```js
game.modules.get("pf2e-scene-animation-manager").api.open();
```

Ein frei belegbares Tastenkürzel steht in den Foundry-Einstellungen bereit.

Alternativ in Foundry unter **Add-on Modules → Install Module → Manifest URL** diese Adresse eintragen:

```text
https://raw.githubusercontent.com/tops-v7/Animation-Helper/main/module.json
```

Das Manifest lädt das versionierte GitHub-Quellarchiv des Tags `v0.1.0`. Das Modul benötigt keinen JavaScript-Build und keine `node_modules` im Foundry-Client. Für neue Versionen Manifestversion und Download-Tag gemeinsam aktualisieren.

## Voraussetzungen und Prüfstand

- Foundry VTT **14**, PF2e **ab 8.6.1** laut Modulmanifest.
- AA **7.x**; untersucht wurden Release **7.1.8** und dessen Quellen.
- Sequencer aktiviert; aktuelles untersuchtes Release **4.3.0**.
- JB2A-Version und tatsächlich verfügbare Assets hängen von der lokalen Installation ab. Der Manager benötigt selbst keine Assets und prüft deren Abspielbarkeit nicht.
- Oberfläche nur für GMs. Es werden keine Zugangsdaten oder Serverdienste benötigt.

**Noch nicht in einer laufenden Foundry-14-Testwelt validiert.** Die Cloud enthält keine lizenzierte Foundry-Runtime und keine Kampagnendaten. Manifest-Kompatibilität ist deklariert, nicht als durchgeführter Laufzeittest zu verstehen; `verified` wurde deshalb nicht gesetzt. Quellcodeanalyse, automatisierte Daten-/Adaptertests und DOM-Interaktionstests sind durchgeführt. Den manuellen [Testplan](docs/TESTING.md) vor Einsatz in einer Kampagne ausführen.

## Bedienung und Funktionen

- Aktuelle Canvas-Szene mit PC-/NPC-Anzahl und Übersicht pro Actor.
- Linked Tokens desselben Actors zusammengefasst, einschließlich Tokenanzahl. Unlinked Tokens bleiben getrennt und verwenden ihren jeweiligen synthetischen Actor.
- Actor-Auswahl, Suche nach Name/Zaubereintrag, Filter für Zauber, Angriffe und Aktionen sowie Animationsstatus.
- Waffen, NPC-Nah-/Fernkampfangriffe (`melee`), Aktionen, Reaktionen, freie Aktionen und aktivierbare Feats. Passive Feats, Effekte und Conditions werden nicht als ausführbare Fähigkeiten gezählt.
- Zauber aus Actor-Items und vorbereiteten Spellcasting-Sammlungen, inklusive Fokuszaubern, zugänglichen dynamischen Zaubern und eingebetteten Verbrauchsgegenstand-Zaubern.
- Vorhandene Override-Spell-Varianten werden zusätzlich angezeigt. Unterschiedliche Zaubergrade werden nicht vollständig ausmultipliziert.
- **AA-Konfiguration öffnen** ruft den originalen AA-Editor für das persistierte Actor-Item auf. Bei Varianten ist der Button ausdrücklich mit **Basiszauber** beschriftet.
- **Globales AA-Autorec öffnen** öffnet AAs vorhandene globale Verwaltung. Keine eigene Speicherung oder Synchronisierung von Zuordnungen.
- Aktualisierung nach Actor-, Item-, Token-, Szenen- und AA-Setting-Änderungen sowie nach dem Schließen von Editoren; Ereignisse werden gebündelt. Such- und Filterzustand bleiben erhalten.

| Status | Bedeutung |
| --- | --- |
| Item-Override | Aktuelle AA-Flags mit `isCustomized` und bekannter Kategorie |
| Autorec | Treffer nach AAs Namens-, Kategorien- und Fallbackregeln |
| Deaktiviert | Am Item deaktiviert oder globale automatische Erkennung abgeschaltet |
| Fehlend | Kein passender Override oder Autorec-Eintrag |
| Ungeklärt | Abhängigkeiten/Daten fehlen, ältere Flags oder ungültige Konfiguration |

„Fehlende Animationen“ zeigt ausschließlich **Fehlend**, nicht deaktivierte oder ungeklärte Einträge. Konfiguriert = Item-Override + Autorec. Varianten zählen als eigene Zeilen. Die Zuordnungsprüfung garantiert keine Wiedergabe: Rollkontext, Assets, Trefferbedingungen, Ammo-Overrides, Sequencer und AA-Laufzeitfehler können das Ergebnis beeinflussen.

## Datensicherheit und Grenzen

Die Übersicht schreibt keine Actor-, Token-, Item- oder AA-Daten und führt keine AA-Migrationen aus. Erst der bewusst geöffnete originale AA-Editor kann seine üblichen Flag-Migrationen und gespeicherten Änderungen vornehmen. Bestehende Zuordnungen werden nicht überschrieben, importiert oder automatisch migriert.

- Varianten bearbeiten in Version 0.1.0 bewusst den Basiszauber. Keine Zusage unabhängiger Varianten-Overrides (AA-Issue #74).
- Temporäre, generierte und in Verbrauchsgegenständen eingebettete Zauber sind lesbar, aber ohne nachgewiesen sichere Persistenz nicht direkt editierbar. Dafür Autorec verwenden. Neue Fähigkeiten eines anderen Moduls erscheinen nur, wenn sie als Items, Strike-Items oder zugängliche Spellcasting-Collections vorliegen.
- Dailies-/Stab-Zauber können trotz Zuordnung in AA nicht auslösen (Issue #84). Der Manager behebt keine Playback-Hooks.
- Region-Lebenszyklen und Sequencer-Elevation werden nicht verändert (Issues #82/#85).
- Alte AA-Flags werden als **Ungeklärt** angezeigt; den AA-Editor zur Prüfung/Migration öffnen. Fehlerhafte globale Daten führen nicht zu einer falschen „Fehlend“-Anzeige.
- Nicht englische Namen benötigen passende Autorec-Einträge. Es wird genau AAs Namenslogik verwendet, keine eigene Übersetzung von Zaubern.
- Die UI ist zunächst deutsch. Große Szenen werden synchron projiziert; bei sehr großen Itemmengen ist weitere Profilierung sinnvoll.

## Entwicklung

Node.js >=22 und Python 3 sind ausreichend. Das Modul selbst hat keine gebündelten Laufzeitabhängigkeiten und benötigt keinen JavaScript-Build. `linkedom` ist nur eine Entwicklungsabhängigkeit für DOM-Tests.

```sh
cd /workspace/Animation-Helper
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm test
npm run build
```

Die Cloud-Aufgabe ist bereits isoliert: vorhandenen Checkout verwenden, keinen zusätzlichen Git-Worktree erstellen.

Optionaler Vergleich mit dem tatsächlichen AA-Quellcode (kein Foundry-Ersatz):

```sh
git clone --depth 1 --branch 7.1.8 https://github.com/theripper93/autoanimations.git /tmp/aa-reference
node tools/verify-aa.mjs /tmp/aa-reference
```

Der Vergleich führt den originalen AA-Resolver und seine Header-Registrierung in einem kontrollierten Node-Kontext aus; Migrationen und Editor-Rendering sind dabei ersetzt. Das originale Editor-Callback wird mit dem unveränderten Item aufgerufen. AA selbst muss zum Paketbau nicht installiert oder gebaut werden.

Architektur, Quellenbelege und Erweiterungsplan: [Technischer Bericht](docs/TECHNICAL-ANALYSIS.md). Künftige Änderungen am AA-Editor-Control oder Resolver werden ausschließlich in `scripts/aa-adapter.js` angepasst. Direkte Editorintegration, Batchbearbeitung und individuelle Variantenpersistenz sind spätere Erweiterungen.
