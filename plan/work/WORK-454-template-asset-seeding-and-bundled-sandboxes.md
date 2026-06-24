{% work id="WORK-454" status="done" priority="medium" complexity="moderate" source="SPEC-109" tags="templates,assets,sandbox" milestone="v0.25.0" %}

# Template asset seeding and bundled sandboxes

{% ref "SPEC-109" /%} §4,§7 — a template seeds the project's `asset:` config
({% ref "SPEC-115" /%}) so it renders cleanly with zero bundled binaries, and may bundle a
sandbox program tree + `backgrounds` so a runtime-bearing template works out of the box.

## Acceptance Criteria
- [x] A template seeds `sites.<site>.assets` from `template.json` at scaffold time; with no base URL configured the scaffolded site renders shape-correct placeholders (zero binary assets, nothing to strip)
- [x] Setting an asset base URL lights up real images with no demo-build flag
- [x] A template may carry a sandbox program-source tree, scaffold-copied to `site.sandbox.dir` (the renamed dir, {% ref "WORK-463" /%})
- [x] A template's `site.backgrounds` is seeded so a named bg-sandbox preset resolves out of the box
- [x] No new build-time or npm dependency is introduced — the sandbox runtime stays CDN-loaded at activation

## Approach
Extend the apply step ({% ref "WORK-453" /%}) to seed `assets`/`backgrounds` and copy the
`sandboxes/` tree to the configured sandbox dir. Asset resolution itself is owned by
{% ref "SPEC-115" /%}; this only requires a template can seed the config.

## Dependencies
- {% ref "WORK-453" /%} — the template apply step
- {% ref "WORK-463" /%} — the renamed sandbox directory field

## References
- {% ref "SPEC-109" /%} §4, §7; {% ref "SPEC-115" /%}; {% ref "ADR-022" /%}

## Resolution

Completed: 2026-06-24

Branch: `claude/v0.25.0-impl-3`. `applyTemplate` seeds `site.assets` + `site.backgrounds` from `template.json` into the written config, and scaffold-copies a bundled `sandboxes/` tree to `site.sandbox.dir` (`./sandboxes`, ADR-022). No new build/npm dependency — the sandbox runtime stays CDN-loaded at activation. Asset *resolution* itself (placeholder vs base-URL) is SPEC-115; here the template seeds the config. Verified by a synthetic-template test (assets + backgrounds + sandbox copy).

{% /work %}
