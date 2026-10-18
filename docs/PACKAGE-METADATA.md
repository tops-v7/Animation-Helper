# Package metadata and compatibility review

Reviewed on October 18, 2026 for PF2E Scene Animation Manager 0.1.4. All descriptions and project documentation remain in English.

## Upstream packages inspected

| Reference | Relevant observations |
| --- | --- |
| [AA release manifest](https://github.com/theripper93/autoanimations/releases/latest/download/module.json) | 7.1.8, Foundry 14; project/author links, language files, required Sequencer and socketlib dependencies; Sequencer has a direct manifest URL. |
| [Sequencer release manifest](https://github.com/fantasycalendar/FoundryVTT-Sequencer/releases/latest/download/module.json) | 4.3.0, verified Foundry 14; README and issue links in addition to update/download metadata. |
| [JB2A Free manifest](https://raw.githubusercontent.com/Jules-Bens-Aa/JB2A_DnD5e/master/module.json) | 0.9.4, verified Foundry 14; HTML description with help/preview/community links, author information, license, and setup media. Its checked source manifest has empty manifest/download fields, so these are not copied as installation links. |
| [PF2e manifest](https://raw.githubusercontent.com/foundryvtt/pf2e/v14-dev/system.pf2e.json) | 8.6.1, minimum Foundry 14.361 and verified 14.369; issue, changelog, and license links. |
| [Foundry package types bundled with PF2e](https://github.com/foundryvtt/pf2e/blob/v14-dev/types/foundry/common/packages/base-package.d.mts) | Confirm `description` can contain HTML, supported documentation fields, compatibility semantics, and dependency `manifest`/`reason` fields. |

The manifests above were fetched directly. Foundry's public module-development article was inaccessible from the cloud network, so the available Foundry type definitions and actual package manifests were used instead. No Patreon package or licensed Foundry runtime was available for independent inspection.

## Gaps addressed

- Replace the one-line client description with an English overview of scene management, search/status filters, AA editor access, linked/unlinked actors, access rules, prerequisites, and limitations.
- Align the Foundry minimum with PF2e's build requirement instead of declaring all version 14 builds supported.
- Use the inspected AA 7.1.8 baseline as the declared minimum, retaining the AA 7.x limit.
- Add direct dependency manifest links and explain why each dependency is needed. socketlib remains AA's transitive dependency rather than a second independent requirement of our code.
- Add README, issue tracker, changelog, license, and contributor project links.
- Explain required configuration dependencies versus optional playback assets, including JB2A Free/Patreon alternatives.
- Add update/removal guidance, troubleshooting, and a useful issue-report checklist.
- Add a changelog and include it in the generated ZIP.
- Record Foundry 14 verification based on the successful user report, and identify the author as Tops.

## Intentionally omitted or still pending

- **Detailed runtime coverage:** `verified: "14"` now records the user-reported successful Foundry test. Exact build and PF2e/AA versions have not been supplied. Upstream verification badges remain separate evidence; the full [acceptance plan](TESTING.md) is still pending.
- **Real screenshots or demo video:** no actual Foundry capture is available. A setup cover or UI screenshot could be added to `media` after capture in a test world. Upstream banners/assets are not reused as our product images.
- **Additional translations:** the module currently provides English text directly. No `languages` entries are declared without actual translation resources.
- **Donation, personal contact, or Discord links:** none have been provided for this project, so none are invented or copied from upstream projects.
- **Public Foundry package listing:** a working GitHub manifest enables URL installation but does not register the module in Foundry's package directory. Directory listing is a separate publication step.
- **Bundled AA/JB2A content:** PF2E Scene Animation Manager ships neither third-party module code nor animation assets; their licenses and distribution remain separate.

The display name remains **PF2E Scene Animation Manager**, while the stable ID `pf2e-scene-animation-manager` and manifest URL preserve update compatibility.
