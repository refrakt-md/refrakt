{% spec id="SPEC-106" status="shipped" tags="image,runes,icon,placeholder,authoring,dx,transform" released-in="v0.22.0" %}

# Image-src scheme sugar: `placeholder:` and `icon:`

Standard Markdown image syntax with a **custom URL scheme** in the destination —
`![Portrait](placeholder:portrait)`, `![GitHub](icon:github)` — resolved during
the transform into generated inline SVG. Two long-wanted affordances fall out of
one small mechanism: a generated image **placeholder** for drafts/fixtures, and
the **`icon:` sugar** for the icon rune that was discussed when the icon rune
landed but never built.

## Motivation

Two threads converge here:

- **Placeholders.** SPEC-102 fixtures need stand-in images that are
  deterministic, offline, and self-contained (for the gallery/harness, the
  editor, the docs, and AI few-shot). The first attempt — inline
  `data:image/svg+xml` URIs — **silently failed**: Markdoc's parser
  (markdown-it's `validateLink`) only allows `data:image/(gif|png|jpeg|webp)`,
  not `svg+xml` (XSS hardening), so the image never parsed. A base64-PNG interim
  works but bloats fixtures with opaque blobs.
- **`icon:` sugar.** The `{% icon name="github" /%}` rune exists, but inline
  icons in prose are clumsy; an `![GitHub](icon:github)` shorthand was wanted.

Both are the same shape: a recognised scheme in an image `src`, resolved to a
generated/looked-up inline SVG.

The pieces are already in place:

- **Custom schemes parse.** `validateLink` only blocks
  `javascript:`/`data:`/`vbscript:`/`file:`; `placeholder:`/`icon:` pass, so
  `![alt](placeholder:portrait)` yields an image node with `src` intact.
- **The hook exists.** The `image` schema transform (`packages/runes/src/nodes.ts`)
  already inspects `src` and, when it matches a known SVG, **returns an inline
  `<svg>` Tag instead of `<img>`** (the `svgFiles` branch). A scheme resolver
  slots in alongside it.
- **Inline SVG sidesteps the sanitizer.** Emitting an `<svg>` *element* (not a
  `data:` URL) avoids the data:svg restriction entirely — and is scalable and
  theme-tintable.

## Design

### 1. Resolution in the image node transform

Extend the `image` schema transform: before the generic `<img>` fallback, match
`src` against registered schemes. A scheme resolver takes the argument (the part
after `scheme:`) plus the node's `alt`/`title`/`property` and returns a
renderable Tag (typically an inline `<svg>`). Unrecognised schemes fall through
to the normal `<img>` path unchanged.

```
![Portrait](placeholder:portrait)   → <svg class="rf-placeholder" data-shape="portrait" …>
![GitHub](icon:github)              → <svg class="rf-icon" aria-label="GitHub" …>
![Photo](/images/real.png)          → <img src="/images/real.png" …>   (unchanged)
```

### 2. `icon:<name>`

Resolves `<name>` against the theme's global icon set — **the same source the
`{% icon %}` rune uses** — and inlines that SVG, with `alt` becoming the
accessible label. This is the inline shorthand for the icon rune; an unknown
icon name warns (dev) and falls back to a neutral glyph or passes through.

### 3. `placeholder:<shape>`

Emits a **generated inline SVG** for a named shape — `cover` (16:9), `square`,
`portrait` (3:4), `wide`, `banner`, `avatar` (round), `thumbnail`. The SVG is a
neutral scene (e.g. horizon + sun) sized to the shape's aspect ratio, drawn with
**theme tokens** (`var(--rf-color-surface)` / `--rf-color-muted` / `--rf-color-border`),
so placeholders pick up the theme tint and dark mode automatically. Deterministic
output (no randomness), so it's screenshot-stable. An unknown shape falls back to
`cover` (with a dev warning).

### 4. Why inline SVG, not a data-URI

- **Sidesteps the sanitizer** — an `<svg>` element isn't a `data:` URL, so the
  `validateLink` SVG block is irrelevant.
- **Readable source** — `![Cover](placeholder:cover)` vs a 600-char base64 blob.
- **Theme-aware + scalable** — references tokens; crisp at any size; adapts to
  light/dark for free.
- **Reusable in real content** — authors can draft with `placeholder:` and swap
  in real images later, and reach for `icon:` inline anywhere.

### 5. Consumers

The image-consuming runes (`figure`, `gallery`, `juxtapose`, `mediatext`,
`showcase`) already handle the inline-`<svg>` output of the existing `svgFiles`
branch, so they accept scheme-resolved SVG the same way. **The SPEC-102 fixtures
migrate to `placeholder:<shape>`**, superseding the base64-PNG interim — clean,
readable, theme-aware fixture images.

### 6. Registry / extensibility

Schemes are a small registry (`scheme → resolver`) so the set is explicit and a
plugin could, in principle, register its own. Core ships `icon:` and
`placeholder:`. Keep it minimal — this is sugar, not a general URL-rewriting
framework.

## Implications

- **Output element changes for schemed images** (`<svg>` not `<img>`); verified
  against the runes that wrap media, reusing the existing inline-SVG precedent.
- **A latent content gotcha is also documented**: plain `data:image/svg+xml` in
  author content silently drops (sanitizer). The `placeholder:`/`icon:` schemes
  give a supported path; a docs note should warn about raw data:svg.
- **Supersedes the PNG-placeholder fixtures** — once schemes land, the fixtures
  swap to `placeholder:` and the base64 blobs are removed.
- Security: inline SVG from *our* generators / *our* icon set is trusted; this
  does **not** open arbitrary author SVG (raw data:svg stays blocked).

## Acceptance Criteria

- [ ] The `image` transform resolves registered `scheme:` srcs to renderables before the `<img>` fallback; unknown schemes pass through unchanged.
- [ ] `icon:<name>` inlines the theme icon set's SVG (same source as `{% icon %}`), with `alt` as the accessible label; unknown name warns + falls back.
- [ ] `placeholder:<shape>` emits a deterministic, theme-token-tinted inline SVG for each shape (cover/square/portrait/wide/banner/avatar/thumbnail); unknown shape falls back to `cover`.
- [ ] `figure`/`gallery`/`juxtapose`/`mediatext`/`showcase` render scheme-resolved SVG correctly (light + dark).
- [ ] SPEC-102 fixtures migrate from base64-PNG to `placeholder:<shape>`; the gallery renders them with no network and no leaked literal markdown.
- [ ] Docs: image-scheme sugar documented (authoring guide), plus a note that raw `data:image/svg+xml` is rejected by the parser.

## Work breakdown (provisional)

1. **Scheme registry + resolver hook** in the `image` transform (`nodes.ts`); unknown-scheme passthrough.
2. **`icon:` resolver** — reuse the icon rune's icon-set resolution; alt/label/a11y.
3. **`placeholder:` resolver** — shape→aspect SVG generator, token-tinted, deterministic.
4. **Migrate fixtures** to `placeholder:`; drop the base64-PNG blobs.
5. **Tests** — scheme parse/resolution, each shape, icon lookup + fallback, consumer-rune rendering.
6. **Docs** — authoring guide entry + the raw-data:svg caveat.

## References

- Hook: `image` schema transform in `packages/runes/src/nodes.ts` (existing `svgFiles` inline-SVG branch).
- Icon source: `{% icon %}` rune (`packages/runes/src/index.ts`) + theme `global` icon group.
- Fixture consumer / supersedes the interim: {% ref "SPEC-102" /%} (the base64-PNG placeholders).
- Root cause it resolves: markdown-it `validateLink` rejects `data:image/svg+xml`.

{% /spec %}
