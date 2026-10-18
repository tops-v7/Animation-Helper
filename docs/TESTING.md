# Prüfung

## Automatisiert

`npm test` prüft mit Node und einem DOM-Harness:

- Linked-Deduplizierung, getrennte unlinked Tokens und fehlende Actors.
- PF2e-Itemtypen, aktive Feats, dynamische Spellcasting-Sammlungen, eingebettete Zauber und Varianten.
- Item-Override, Autorec, Deaktivierung, alte/ungültige Daten, exakte und partielle Suche, Ausschlussbegriffe, Waffen-Fallbacks und Template-Sonderfall.
- Originales V2-Control, Legacy-Fallback, verweigerte Bearbeitung temporärer Items und GM-Sperre.
- Tatsächliche DOM-Ausgabe, Escaping von Actor-Namen, Filterinteraktion, Editorübergabe, automatische Aktualisierung und Hook-Aufräumen.

`node tools/verify-aa.mjs /tmp/aa-reference` vergleicht zusätzlich den Adapter mit dem originalen AA-Resolver. Er führt keinen Foundry-Client und keinen echten Svelte-Editor aus.

`npm run build` prüft alle Manifest-Dateiverweise, erzeugt ein reproduzierbares ZIP und prüft dessen CRC und enthaltenes Manifest.

## Manueller Abnahmetest in Foundry 14 — noch offen

Eine separate Testwelt verwenden und vorher sichern. Versionen sowie Testergebnis protokollieren. Keine produktive Kampagne zum erstmaligen Test verwenden.

1. PF2e 8.6.1, AA 7.1.8, Sequencer 4.3.0, socketlib und vorhandene JB2A-Assets aktivieren. Browserkonsole auf Fehler prüfen.
2. Szene mit PC, zwei linked Tokens desselben PCs, zwei unlinked Goblins, NPC mit `melee`-Angriffen und einem Token ohne Actor öffnen. Erwartung: PC einmal mit Anzahl, jeder unlinked Goblin separat, fehlender Actor als Hinweis.
3. Vorbereitete, spontane und Fokuszauber, Reaktion, freie Aktion, aktives und passives Feat hinzufügen. Spellcasting-Quellen und Kategorien prüfen. Passive Feats dürfen nicht auftauchen.
4. Einen Zauber nur über Autorec zuordnen. Er muss als Autorec gelten und aus dem Fehlend-Filter verschwinden. Exakt/unscharf, ausgeschlossene Namen und lokalisierte Waffen-Gruppennamen prüfen.
5. AA-Editor aus dem Manager öffnen. Am tatsächlichen Item einen Override speichern. Status muss ohne Neuöffnen auf Item-Override wechseln. Deaktivieren muss „Deaktiviert“ ergeben. Andere Items/Actors dürfen keine neuen Flags erhalten.
6. Dasselbe für genau einen unlinked Goblin tun. Der andere Goblin und der World-Actor müssen unverändert bleiben.
7. Globales Autorec aus dem Manager öffnen, Eintrag ändern/speichern. Zählwerte und Status müssen aktualisieren. Globales Autorec deaktivieren, Override muss weiter als Override gelten.
8. Spell-Varianten hinzufügen: eigene Zeilen und Namens-Fallback prüfen. Editorbutton muss **Basiszauber** benennen und genau diesen öffnen. Keine unabhängige Variantenbearbeitung erwarten.
9. Stäbe/Dailies und Schriftrolle/Zauberstab prüfen, soweit in der Testinstallation vorhanden. Temporäre Zauber müssen ohne direkten Editorbutton erscheinen; Autorec bleibt zugänglich. Playback-Probleme getrennt erfassen.
10. Actor/Item/Token löschen, ändern und neu erstellen; Szene wechseln und Canvas schließen. Keine veralteten Editorziele, keine Fehler oder doppelten Hooks nach wiederholtem Öffnen/Schließen.
11. Als Spieler anmelden. Kein Button; API-Aufruf öffnet keine Verwaltung. AA deaktivieren bzw. inkompatible Version simulieren: klare Fehlermeldung statt Schreibzugriff.
12. Szenen mit vielen Tokens/Items auf Reaktionszeit prüfen. Suche/Filter und Auswahl müssen nach Updates erhalten bleiben, soweit Einträge noch vorhanden sind.

Animationswiedergabe ist kein Feature dieses Managers. Falls zusätzlich getestet, Zuordnungserkennung und tatsächliches Playback als getrennte Ergebnisse festhalten.
