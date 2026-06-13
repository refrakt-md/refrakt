{% work id="WORK-419" status="pending" priority="medium" complexity="moderate" source="SPEC-106" milestone="v0.22.0" tags="image,icon,runes,authoring" %}

# `icon:` image-src resolver

The inline icon shorthand discussed when the icon rune landed: `![GitHub](icon:github)`
resolves to the named icon's inline SVG — the same source the `{% icon %}` rune uses.

## Scope

- Register an `icon:<name>` resolver (via {% ref "WORK-418" /%}) that looks the name up in the
  theme's `global` icon group and inlines its SVG, with `alt` as the accessible label
  (`aria-label`/`role="img"`).
- Unknown icon name → dev warning + graceful fallback (neutral glyph or passthrough), not a
  hard error.
- Reuse the `{% icon %}` rune's resolution path rather than duplicating it.

## Acceptance Criteria

- [ ] `![label](icon:<name>)` renders the icon set's SVG inline, with `alt` exposed as the accessible label.
- [ ] An unknown icon name warns (dev) and falls back gracefully.
- [ ] Resolution shares the `{% icon %}` rune's icon source; tests cover a known + unknown name.

## Dependencies

- Requires {% ref "WORK-418" /%} (the scheme registry).

## References

- {% ref "SPEC-106" /%} · `{% icon %}` rune (`packages/runes/src/index.ts`) + theme `global` icon group.

{% /work %}
