{% work id="WORK-419" status="done" priority="medium" complexity="moderate" source="SPEC-106" milestone="v0.22.0" tags="image,icon,runes,authoring" %}

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

- [x] `![label](icon:<name>)` renders the icon set's SVG inline, with `alt` exposed as the accessible label.
- [x] An unknown icon name warns (dev) and falls back gracefully.
- [x] Resolution shares the `{% icon %}` rune's icon source; tests cover a known + unknown name.

## Dependencies

- Requires {% ref "WORK-418" /%} (the scheme registry).

## References

- {% ref "SPEC-106" /%} · `{% icon %}` rune (`packages/runes/src/index.ts`) + theme `global` icon group.

## Resolution

Completed: 2026-06-13

Branch: `claude/spec-106-image-src-schemes`

### What was done
- Extracted the icon-registry lookup into `packages/runes/src/lib/icon-resolve.ts` (`resolveIcon`, `splitIconName`) so the `{% icon %}` rune and the `icon:` scheme share exactly one resolution path (`config.variables.__icons`).
- Refactored `packages/runes/src/tags/icon.ts` to delegate to `resolveIcon` (behaviour unchanged; still silent on misses).
- Registered the `icon:<name>` scheme in `image-schemes.ts`: resolves the name (incl. `group/name`) to inline SVG, sets `role="img"` + `aria-label` from the image `alt`, and `console.warn`s + falls back to a neutral `<span>` glyph on unknown names.
- Tests cover a known icon (svg + a11y label, no leaked `<img>`) and an unknown name (warn + fallback span).

### Notes
- `resolveIcon` returns `{ tag, found }`; the rune ignores `found` (stays silent), the scheme uses it to decide whether to warn — so the rune's existing behaviour is unchanged while the scheme warns as specified.

{% /work %}
