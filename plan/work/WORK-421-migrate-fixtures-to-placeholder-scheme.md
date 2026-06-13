{% work id="WORK-421" status="done" priority="medium" complexity="simple" source="SPEC-106" milestone="v0.22.0" tags="image,placeholder,fixtures,gallery" %}

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

- [x] The image-bearing fixtures use `placeholder:<shape>`; no base64 blobs remain; `RUNE_EXAMPLES` regenerated (drift test green).
- [x] `refrakt gallery` renders the image fixtures as inline SVG placeholders (both modes), deterministic, no network, no leaked literal markdown.

## Dependencies

- Requires {% ref "WORK-420" /%} (the `placeholder:` resolver). Supersedes the base64-PNG interim.

## References

- {% ref "SPEC-106" /%} · {% ref "SPEC-102" /%} · `packages/runes/fixtures/*.md`.

## Resolution

Completed: 2026-06-13

Branch: `claude/spec-106-image-src-schemes`

### What was done
- Replaced the `data:image/svg+xml,…` image srcs in `figure`, `gallery`, `juxtapose`, `mediatext`, and `showcase` fixtures with `placeholder:<shape>` (`cover` for the landscape slots, `square` for mediatext's 1:1 ratio). These data:svg URIs were the silently-dropped ones (rejected by markdown-it `validateLink`), so this both implements the migration and fixes the broken rendering.
- Regenerated `packages/runes/src/examples.ts` (`RUNE_EXAMPLES`); the drift test passes.
- Extended the consumer CSS image selectors (`figure`, `gallery`, `juxtapose`, `mediatext`) and the shared frame chrome (`dimensions/frame.css`) to match `.rf-placeholder` alongside `img`, so placeholders size like real images in every slot.

### Verification
- `refrakt gallery --site main` renders 27 `.rf-placeholder` SVGs (light + dark), 0 leaked literal `](placeholder:` markdown, 0 `data:image/png`, and no external `<img>` requests. The only `data:image/svg` left in the output are theme CSS `mask-image:` chrome, unrelated to content.

### Notes
- No base64-PNG blobs existed on this branch (that interim lived on the unmerged `claude/fix-placeholder-images` branch); the migration here is from the data:svg URIs.

{% /work %}
