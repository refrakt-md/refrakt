{% work id="WORK-418" status="ready" priority="medium" complexity="moderate" source="SPEC-106" milestone="v0.22.0" tags="image,runes,transform,authoring" %}

# Image-src scheme registry + resolver hook

The foundation for {% ref "SPEC-106" /%}: recognise custom URL schemes in a Markdown
image's `src` during the transform and resolve them to a renderable, before the generic
`<img>` fallback. Custom schemes (`placeholder:`, `icon:`) already survive markdown-it's
`validateLink`, so `![alt](scheme:arg)` arrives as an image node with `src` intact.

## Scope

- Extend the `image` schema transform (`packages/runes/src/nodes.ts`) with a small
  `scheme → resolver` registry. Each resolver receives the argument (after `scheme:`) plus
  the node's `alt`/`title`/`property` and returns a renderable `Tag` (typically an inline
  `<svg>`, mirroring the existing `svgFiles` inline-SVG branch).
- Unrecognised schemes (and ordinary paths/URLs) fall through to the normal `<img>` path
  unchanged.
- Establish the registry so the `icon:` (WORK-419) and `placeholder:` (WORK-420) resolvers
  plug in; ship neither resolver here (a no-op/test resolver proves the hook).

## Acceptance Criteria

- [ ] The `image` transform matches `src` against a scheme registry before the `<img>` fallback; a registered resolver's returned Tag replaces the `<img>`.
- [ ] Unknown schemes, relative paths, and absolute URLs pass through to `<img>` unchanged (existing `svgFiles` behaviour preserved).
- [ ] Resolvers receive the scheme argument + `alt`/`title`/`property`; a unit test exercises the hook with a stub resolver.

## References

- {% ref "SPEC-106" /%} · `packages/runes/src/nodes.ts` (the `image` schema transform).

{% /work %}
