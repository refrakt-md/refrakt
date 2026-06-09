{% work id="WORK-365" status="ready" priority="medium" complexity="moderate" source="SPEC-086" tags="chrome, runes, lumina, docs, migration" milestone="v0.20.0" %}

# Collapse showcase into the frame model with deprecated aliases + docs

Re-express `showcase` as `frameTarget: 'self'` consuming `frame`, with deprecated aliases for its old attributes (breakout `bleed` retained), and document the surface model.

## Acceptance Criteria
- [ ] `showcase` is `frameTarget: 'self'` consuming `frame`; old `shadow|bleed|offset|aspect|place` are deprecated aliases (warn) per the migration table; breakout retained.
- [ ] Page-level full-bleed is documented as a `width` concern (article named-line grid) distinct from `displace`/host-owned-clip; `showcase`/`figure` is the attribute-surface wrapper.
- [ ] Card/figure/showcase/bento reference docs + a theme-authoring "frames" section document the surface model (`elevation`=self, `frame`=media) and the preset registry.
- [ ] Changesets for `@refrakt-md/runes` + `@refrakt-md/lumina`.

## Approach
`packages/runes/src/tags/showcase.ts`, `Showcase` config, `showcase.css`. SPEC-086 §5.

## References

- {% ref "SPEC-086" /%}

{% /work %}
