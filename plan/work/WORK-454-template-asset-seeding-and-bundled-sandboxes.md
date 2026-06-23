{% work id="WORK-454" status="ready" priority="medium" complexity="moderate" source="SPEC-109" tags="templates,assets,sandbox" milestone="v0.25.0" %}

# Template asset seeding and bundled sandboxes

{% ref "SPEC-109" /%} §4,§7 — a template seeds the project's `asset:` config
({% ref "SPEC-115" /%}) so it renders cleanly with zero bundled binaries, and may bundle a
sandbox program tree + `backgrounds` so a runtime-bearing template works out of the box.

## Acceptance Criteria
- [ ] A template seeds `sites.<site>.assets` from `template.json` at scaffold time; with no base URL configured the scaffolded site renders shape-correct placeholders (zero binary assets, nothing to strip)
- [ ] Setting an asset base URL lights up real images with no demo-build flag
- [ ] A template may carry a sandbox program-source tree, scaffold-copied to `site.sandbox.dir` (the renamed dir, {% ref "WORK-463" /%})
- [ ] A template's `site.backgrounds` is seeded so a named bg-sandbox preset resolves out of the box
- [ ] No new build-time or npm dependency is introduced — the sandbox runtime stays CDN-loaded at activation

## Approach
Extend the apply step ({% ref "WORK-453" /%}) to seed `assets`/`backgrounds` and copy the
`sandboxes/` tree to the configured sandbox dir. Asset resolution itself is owned by
{% ref "SPEC-115" /%}; this only requires a template can seed the config.

## Dependencies
- {% ref "WORK-453" /%} — the template apply step
- {% ref "WORK-463" /%} — the renamed sandbox directory field

## References
- {% ref "SPEC-109" /%} §4, §7; {% ref "SPEC-115" /%}; {% ref "ADR-022" /%}

{% /work %}
