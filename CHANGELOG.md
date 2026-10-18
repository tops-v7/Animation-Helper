# Changelog

## 0.1.4 — October 18, 2026

- Set the module author to **Tops** in the manifest, package metadata, README, and license attribution.
- Add `compatibility.verified: "14"` to resolve the unknown-compatibility label for the target Foundry generation, based on the successful user-reported test.
- Keep the Foundry minimum at 14.361 and maximum at 14; do not claim an unreported exact build or dependency combination.
- Update runtime-validation notes and compatibility troubleshooting. The full acceptance checklist remains pending.

## 0.1.3 — October 18, 2026

- Use **PF2E Scene Animation Manager** consistently in the module list, client description, window title, token tool, keyboard shortcut, contributor labels, and documentation.
- Align the development package name with the stable module ID `pf2e-scene-animation-manager`.
- Preserve the module ID, API, repository address, and manifest URL so existing installations continue to update.
- Normalize HTML link quoting in the client description.

## 0.1.2 — October 18, 2026

- Expand the Foundry client description with features, access rules, requirements, and key limitations.
- Set the Foundry minimum to 14.361, matching the supported PF2e baseline; retain the version 14 maximum.
- Raise the declared AA minimum to the inspected 7.1.8 baseline; AA 8+ remains unsupported.
- Add dependency manifest links and explanations for PF2e, AA, and Sequencer.
- Add README, issue tracker, changelog, license, and project links to package metadata.
- Document the compatibility matrix, socketlib's role, optional JB2A assets, update/removal steps, and troubleshooting.
- Include this changelog in the installable ZIP.
- Keep PF2E Scene Animation Manager's own Foundry runtime verification pending; upstream compatibility badges are not treated as evidence of our runtime compatibility.

## 0.1.1 — October 18, 2026

- Update the displayed module branding.
- Translate the interface, notifications, README, technical report, and test plan into English.
- Retain the technical module ID and manifest URL for existing installations.

## 0.1.0 — October 18, 2026

- Add the initial scene-based GM configuration manager for PF2e and AA.
- List linked/synthetic actors, relevant abilities, accessible spell variants, and dynamic spells.
- Add search, category/status filters, scene summaries, and automatic refresh.
- Open AA's existing item editor and global Autorec menu.
- Add an installable ZIP, versioned manifest downloads, automated tests, source comparisons, and a manual acceptance plan.
