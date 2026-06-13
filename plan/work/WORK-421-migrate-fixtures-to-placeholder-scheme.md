{% work id="WORK-421" status="pending" priority="medium" complexity="simple" source="SPEC-106" milestone="v0.22.0" tags="image,placeholder,fixtures,gallery" %}

# Migrate fixtures to `placeholder:` (drop the base64-PNG interim)

With the `placeholder:` resolver in place, swap the SPEC-102 fixtures' base64-PNG image
blobs for clean `![alt](placeholder:<shape>)` references, and confirm the image-consuming
runes render the resolved SVG.

## Scope

- Replace the `data:image/png;base64,…` srcs in the image-bearing fixtures (`gallery`,
  `juxtapose`, `figure`, `mediatext`, `showcase`) with `placeholder:<shape>` matching each
  slot's aspect (cover/portrait/etc.). Regenerate `RUNE_EXAMPLES`.
- Verify `figure`/`gallery`/`juxtapose`/`mediatext`/`showcase` render the resolved inline SVG
  in the gallery (light + dark), with no leaked literal markdown and no network.

## Acceptance Criteria

- [ ] The image-bearing fixtures use `placeholder:<shape>`; no base64 blobs remain; `RUNE_EXAMPLES` regenerated (drift test green).
- [ ] `refrakt gallery` renders the image fixtures as inline SVG placeholders (both modes), deterministic, no network, no leaked literal markdown.

## Dependencies

- Requires {% ref "WORK-420" /%} (the `placeholder:` resolver). Supersedes the base64-PNG interim.

## References

- {% ref "SPEC-106" /%} · {% ref "SPEC-102" /%} · `packages/runes/fixtures/*.md`.

{% /work %}
