{% work id="WORK-426" status="pending" priority="medium" complexity="moderate" source="SPEC-107" milestone="v0.23.0" tags="theme,surface,migration,docs,cli" %}

# Migration + docs for the surface axes

Land the breaking `elevation` rename safely and bring the site + docs onto the new vocabulary
({% ref "SPEC-107" /%} §5).

## Scope

- A `refrakt`-side codemod that rewrites authored `elevation="none|sm|md|lg"` in content to the
  new values (`none`→`flat`, `sm`/`md`→`raised`, `lg`→`floating`); run it across the site.
- Rewrite `surfaces.md` (the canonical surfaces reference) around the three axes; migrate the
  `elevation=` usages in `figure.md`, `card.md`, `bento.md`; update
  `extend/theme-authoring/dimensions` (and any reference to the old named scale).
- Add a changeset documenting the breaking change + the alias deprecation window. Leave
  `releases.md` (historical) untouched.

## Acceptance Criteria

- [ ] A codemod migrates `elevation` values in content; the site has no remaining `none|sm|md|lg` elevation usages.
- [ ] `surfaces.md` documents `elevation` (ladder), `width` (bleed), and `prominence` (family) accurately; `figure`/`card`/`bento` examples use the new values.
- [ ] A changeset records the breaking change and the deprecation window.

## Dependencies

- Requires {% ref "WORK-423" /%} (aliases to migrate from) and {% ref "WORK-425" /%} (final vocabulary in the theme).

## References

- {% ref "SPEC-107" /%} · `site/content/runes/surfaces.md` · `site/content/extend/theme-authoring/dimensions.md`.

{% /work %}
