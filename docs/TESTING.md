# Testing Animation Helper

## Automated checks

`npm test` uses Node and a DOM harness to verify:

- Linked actor deduplication, separate unlinked tokens, and missing actors.
- PF2e item types, active feats, dynamic spellcasting collections, embedded spells, and variants.
- Item overrides, Autorec, disabling, old/invalid data, exact and partial matching, excluded terms, weapon fallbacks, and template handling.
- Original V2 controls, legacy fallback, refusal to edit temporary items, and GM access checks.
- DOM output, actor-name escaping, filter interaction, editor handoff, automatic refresh, and hook cleanup.

`node tools/verify-aa.mjs /tmp/aa-reference` additionally compares the adapter against AA's original resolver. It does not run a Foundry client or the actual Svelte editor.

`npm run build` checks manifest file references, produces a reproducible ZIP, and verifies its CRC and bundled manifest.

## Manual Foundry 14 acceptance test — pending

Use a separate test world and back it up first. Record installed versions and test results. Do not use a production campaign for the first acceptance run.

1. Enable PF2e 8.6.1, AA 7.1.8, Sequencer 4.3.0, socketlib, and available JB2A assets. Check the browser console for errors. The module list, window title, token tool, and keyboard shortcut must use **Animation Helper**.
2. Open a scene with a PC, two linked tokens for that PC, two unlinked goblins, an NPC with `melee` attacks, and a token without an actor. Expect one grouped PC with a count, separate unlinked goblins, and a missing-actor notice.
3. Add prepared, spontaneous, and focus spells; a reaction; a free action; and active/passive feats. Check spellcasting sources and categories. Passive feats must not appear.
4. Assign a spell through Autorec only. It must show **Autorec** and disappear from the **Missing animations** filter. Check exact/partial matches, excluded terms, and localized weapon group names.
5. Open the AA editor from Animation Helper and save an override on the actual item. The status must change to **Item override** without reopening the manager. Disabling it must show **Disabled**. Other actors/items must receive no new flags.
6. Repeat for exactly one unlinked goblin. The other goblin and the world actor must remain unchanged.
7. Open global Autorec, change an entry, and save. Counts and status must refresh. Disable global Autorec; an item override must still count as an override.
8. Add spell variants and check separate rows and base-name fallbacks. The editor button must explicitly say **base spell** and open that spell. Do not expect independent variant editing.
9. Check staves/Dailies and scrolls/wands where available. Temporary spells must appear with the direct editor button disabled; Autorec must remain accessible. Record playback issues separately.
10. Delete, change, and create actors/items/tokens; switch scenes; and close the canvas. There must be no stale editor targets, errors, or duplicate hooks after repeatedly opening and closing the manager.
11. Log in as a player. No tool button should appear, and the API must not open the manager. Disable AA or simulate an incompatible version: expect a clear error instead of a write operation.
12. Check responsiveness in scenes with many tokens/items. Search, filters, and selection should survive updates while the selected entries still exist.
13. Check empty states, status explanations, error messages, variant notes, and search placeholders. All module-provided text must be in English. Campaign names and PF2e-localized content may retain their configured language.

Animation playback is outside the manager's functionality. If you test it separately, record assignment detection and actual playback as distinct results.
