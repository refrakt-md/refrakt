{% work id="WORK-418" status="done" priority="medium" complexity="moderate" source="SPEC-106" milestone="v0.22.0" tags="image,runes,transform,authoring" %}

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

- [x] The `image` transform matches `src` against a scheme registry before the `<img>` fallback; a registered resolver's returned Tag replaces the `<img>`.
- [x] Unknown schemes, relative paths, and absolute URLs pass through to `<img>` unchanged (existing `svgFiles` behaviour preserved).
- [x] Resolvers receive the scheme argument + `alt`/`title`/`property`; a unit test exercises the hook with a stub resolver.

## References

- {% ref "SPEC-106" /%} · `packages/runes/src/nodes.ts` (the `image` schema transform).

## Resolution

Completed: 2026-06-13

Branch: `claude/spec-106-image-src-schemes`

### What was done
- Added `packages/runes/src/lib/image-schemes.ts` — a `scheme → resolver` registry (`registerImageScheme`, `hasImageScheme`, `resolveImageScheme`). Schemes are matched by the leading run before the first colon per URI generic syntax; bare paths, absolute URLs, and `data:` URIs never match and fall through.
- Wired the hook into the `image` schema transform (`packages/runes/src/nodes.ts`): resolution runs before path-joining and the `<img>` fallback; a resolved Tag replaces the `<img>` and inherits `data-field` when `property` is set. The existing `svgFiles` inline-SVG branch is preserved untouched.
- Exported the registry API from `@refrakt-md/runes` so plugins can register their own schemes.
- Tests in `packages/runes/test/image-schemes.test.ts` exercise the hook with a stub resolver (arg + alt/title/property), img replacement, and unknown-scheme/path passthrough.

### Notes
- Resolver signature: `(arg, { alt, title, property, config }) => Tag | null`. Returning null is reserved for future opt-out; the core resolvers always return a Tag.

{% /work %}
