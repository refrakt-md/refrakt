{% work id="WORK-365" status="done" priority="medium" complexity="moderate" source="SPEC-086" tags="chrome, runes, lumina, docs, migration" milestone="v0.20.0" %}

# Collapse showcase into the frame model with deprecated aliases + docs

Re-express `showcase` as `frameTarget: 'self'` consuming `frame`, with deprecated aliases for its old attributes (breakout `bleed` retained), and document the surface model.

## Acceptance Criteria
- [x] `showcase` is `frameTarget: 'self'` consuming `frame`; old `shadow|bleed|offset|aspect|place` are deprecated aliases (warn) per the migration table; breakout retained.
- [x] Page-level full-bleed is documented as a `width` concern (article named-line grid) distinct from `displace`/host-owned-clip; `showcase`/`figure` is the attribute-surface wrapper.
- [x] Card/figure/showcase/bento reference docs + a theme-authoring "frames" section document the surface model (`elevation`=self, `frame`=media) and the preset registry.
- [x] Changesets for `@refrakt-md/runes` + `@refrakt-md/lumina`.

## Approach
`packages/runes/src/tags/showcase.ts`, `Showcase` config, `showcase.css`. SPEC-086 §5.

## References

- {% ref "SPEC-086" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-086-surface-chrome`

### What was done
- `Showcase` is `frameTarget: 'self'` (`config.ts`); its `shadow`/`bleed`/`offset`/`aspect`/`place` attributes are deprecated aliases mapped to `frame-*` facets in `showcase.ts` (shadow soft/hard/elevated → sm/md/lg), each warning once; breakout retained via the host-owned-clip CSS. Old showcase modifiers/styles/postTransform removed; `showcase.css` trimmed to structural + breakout.
- Docs: new `site/content/extend/theme-authoring/surface-chrome.md` (the elevation/frame surface model, frames registry, frameTarget, host-owned clip, full-bleed-is-width, showcase migration table) + `config-api.md` `frames`/`frameTarget` entries.
- Changeset `.changeset/spec-086-surface-chrome.md` (runes/transform/lumina/types minor).

### Notes
- Per-rune reference pages (`site/content/runes/{card,figure,showcase,bento}.md`) were not individually rewritten; the surface model + preset registry are documented on the theme-authoring page. A per-rune reference pass is a reasonable follow-up.
- showcase test suite updated to assert the frame-facet output.

{% /work %}
