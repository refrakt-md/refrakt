{% spec id="SPEC-115" status="draft" tags="assets,images,config,authoring,runes,dx" %}

# Project asset resolution — the `asset:` scheme

Authors reference images two ways today: a **bare path/URL** (`hero.jpg`,
`https://cdn.example.com/img/hero.jpg`) that becomes a plain `<img>`, or a **registered
image-src scheme** (`icon:github`, `placeholder:cover`) that the transform resolves to a
generated `Tag`. There is no middle layer: content that points at hosted assets must spell out
the full URL at every reference, so the host is baked into the content. Move a CDN, switch a
dev/staging/prod bucket, or version a cache key, and every `.md` file has to change.

This spec introduces **`asset:<key>`** — a project-level **indirection** for image sources,
resolved by a small config-driven rule rather than per-reference URLs. Content names *what* an
image is (`asset:cover-article-1`); the project says *where* assets live, once, in
`refrakt.config.json`. It builds directly on the existing image-scheme registry
(`packages/runes/src/lib/image-schemes.ts`) and the generated placeholders
(`packages/runes/src/lib/placeholder.ts`), and it **generalises** the template-scoped asset
manifest that {% ref "SPEC-109" /%} sketched: that becomes a *consumer* of this mechanism, not
its own bespoke two-mode system.

This is an **aliasing/indirection** layer, not an image *pipeline*. Responsive `srcset`,
format negotiation, and build-time transforms are explicitly out of scope (see Non-goals).

## Problem evidence

Measured against the current image-resolution code:

- **No project-level indirection exists.** `resolveImageScheme(src, ctx)`
  (`packages/runes/src/lib/image-schemes.ts`) splits `scheme:arg` and dispatches to a registered
  resolver; bare paths and absolute URLs return `null` and fall through to `<img>`. The only
  registered schemes are `icon:` and `placeholder:`. Nothing maps a logical key to a hosted URL.
- **Hosted-asset content is host-coupled.** A site whose images live at one base URL repeats that
  URL at every reference. The base URL is not declared anywhere; it is implicit in hundreds of
  strings, so re-hosting is a find-and-replace across content.
- **{% ref "SPEC-109" /%} introduced `asset:` too narrowly.** It scoped the scheme to template
  demos with a hard **two-mode** design (placeholder by default; a *demo-build flag* re-registers
  an override resolver that reads `previewUrl`s from a `template.json` manifest). That is a useful
  behaviour, but it is a *special case* of "resolve `asset:<key>` from project config" — and the
  build-flag mode is machinery this spec can dissolve.
- **`placeholder:` is keyed by shape only.** `placeholder:cover` cannot distinguish two different
  covers or map them to distinct real images. A logical *identity* key is the missing primitive
  that both hosted-asset aliasing and template previews need.

## Design

### 1. The `asset:` scheme and its config

`asset:` is a registered image-src scheme like `icon:`/`placeholder:`. A reference is:

```
asset:<key>[@<shape>]
```

- **`<key>`** is the asset's path. It **carries its own file extension** (`aurora-cover.jpg`,
  `wave-divider.svg`) so a site mixes formats with no per-site configuration, and the reference is
  honest about the file it points at. It may contain `/` for hosted sub-folders
  (`photos/studio.jpg`).
- **`@<shape>`** is an **optional** trailing shape hint (`@avatar`, `@portrait`) used **only** by
  the placeholder fallback (§3). It is orthogonal to the key path and is dropped when a real URL
  resolves.

The resolver reads a project asset configuration declared under `sites.<site>.assets` in
`refrakt.config.json` (threaded onto the Markdoc `config.variables`, alongside `__icons`):

```jsonc
// refrakt.config.json → sites.<site>.assets
{
  "baseUrl": "https://cdn.example.com/img/",
  "pattern": "{baseUrl}{key}",              // optional; how a key becomes a URL
  "overrides": {                            // optional per-key escape hatch
    "partner-logo.svg": "https://partner.example.org/brand/logo.svg"
  }
}
```

- **`baseUrl` / `pattern`** turn a key into a URL by substitution. `pattern` defaults to
  `{baseUrl}{key}`, so the simplest useful config is a single `baseUrl`. Because keys carry their
  own extension, no extension lives in the pattern; a site that genuinely is one format may still
  use a fixed-extension pattern (`{baseUrl}{key}.webp`) and drop extensions from its keys.
- **`overrides`** map a specific key (extension included, `@shape` excluded) to an explicit URL,
  for assets that don't fit the pattern or live elsewhere.
- The config is **project-level** (`sites.<site>.assets`), following the project-vs-theme split
  already used for `backgrounds`/`sandbox` ({% ref "SPEC-104" /%}); a template seeds it (§4).

### 2. The single resolution rule (subsumes "demo mode")

`asset:<key>[@<shape>]` resolves by one rule, evaluated at transform time (the `@shape` is
stripped first; it never affects URL building):

1. If `overrides[key]` exists → emit an `<img>` to that URL.
2. Else if a `baseUrl`/`pattern` is configured → substitute and emit an `<img>`.
3. Else → emit a **shape-correct generated placeholder** (`placeholderSvg`), using `@shape` (or the
   default) per §3.

Bare paths and absolute URLs are unaffected — they never match the `asset:` scheme and fall
through to `<img>` exactly as today, so authors mix `asset:` keys and literal `src`s freely.

This rule **collapses {% ref "SPEC-109" /%}'s two modes into one.** "Distributed mode" is just
*no asset config present* → placeholders. "Demo mode" is just *a `baseUrl` is set* → real images.
There is no separate demo-build flag and no second code path: the same content renders
placeholders or real images purely as a function of config. A freshly scaffolded site ships with
no `baseUrl`, so it is placeholder-backed and never broken; the author adds their `baseUrl` and
every `asset:` reference lights up at once.

**Worked example.** Given the §1 config (`baseUrl` + the `partner-logo.svg` override):

| Reference | key / shape | Rule | Output |
|-----------|-------------|------|--------|
| `asset:aurora-cover.jpg` | `aurora-cover.jpg` / — | pattern | `…/img/aurora-cover.jpg` |
| `asset:elin-face.jpg@avatar` | `elin-face.jpg` / avatar | pattern | `…/img/elin-face.jpg` (`@avatar` dropped) |
| `asset:photos/studio.jpg@portrait` | `photos/studio.jpg` / portrait | pattern | `…/img/photos/studio.jpg` (folder kept, `@portrait` dropped) |
| `asset:partner-logo.svg` | `partner-logo.svg` / — | override | `https://partner.example.org/brand/logo.svg` |
| `hero-special.jpg` | — | no scheme | `hero-special.jpg` (untouched) |

With the `assets` block removed (fresh fork / pre-upload), the same references hit rule 3:
`aurora-cover.jpg` → default `cover` placeholder, `elin-face.jpg@avatar` → round `avatar`,
`photos/studio.jpg@portrait` → `portrait`.

### 3. Shape hint — the `@<shape>` delimiter

The placeholder fallback (rule 3) needs a key's aspect shape (`cover`, `avatar`, …), but the key
itself doesn't carry one — `elin-face.jpg` doesn't say "avatar", so without a hint every fallback
defaults to `cover` and a headshot draws as a wide banner. The shape is expressed by an
**optional trailing `@<shape>`**:

```markdown
![Aurora cover](asset:aurora-cover.jpg)          <!-- no hint → default 'cover' -->
![Headshot](asset:elin-face.jpg@avatar)          <!-- → 'avatar' placeholder -->
![Studio](asset:photos/studio.jpg@portrait)      <!-- folder + 'portrait' -->
```

A trailing delimiter (not a leading `shape/` segment) keeps shape **orthogonal to the key path**:
`/` always means a folder, `@` always means a shape, so there is no "is this segment a shape or a
directory?" ambiguity. Parse rule, with a safety net:

- Split the argument on the **last** `@`.
- The suffix is the shape **only if** it is a known placeholder shape (`cover`, `square`,
  `portrait`, `wide`, `banner`, `avatar`, `thumbnail`); otherwise the `@` is treated as part of the
  key (so a stray `@` in a filename can't misfire). Unknown-but-shaped suffixes warn in dev and
  fall back to the default shape.

The `@<shape>` does exactly one job — make the no-config preview render the right aspect — and is
**dropped before URL building**, so it is inert the moment a real asset resolves (rules 1–2). It is
therefore cheap: short refs are the norm; you add a hint only where a no-asset placeholder would
otherwise look wrong. Template content can usually omit it entirely, since a template's seeded
manifest (§4) supplies shapes for its keys.

### 4. Relationship to templates ({% ref "SPEC-109" /%})

A template's `template.json` **asset manifest** becomes a **scaffold-time seed**: at scaffold its
`baseUrl`/`pattern`/`overrides` (and any author-published preview URLs) merge into the new
project's `sites.<site>.assets`, exactly the way the template's `configFragment`, `backgrounds`,
and `sandbox` config already merge. Shapes travel in the **content** via `@shape` (§3), not as a
separate manifest map — one shape mechanism, not two. After that, resolution is the §2 rule like
any other site. Consequences:

- The template author's "publish a live preview" flow is just *building with a `baseUrl` set* — no
  bespoke demo-build flag (SPEC-109 §4/§5 lose it; they defer to this spec).
- The scaffolded site ships with `@shape` hints in its content but **no `baseUrl`**, so it is
  placeholder-backed with nothing to strip — preserving SPEC-109's "zero binary assets, nothing to
  delete" guarantee.

### 5. Registry integration

`asset:` registers through the existing `registerImageScheme('asset', resolver)`; the resolver
reads `config.variables.__assets` (populated from `sites.<site>.assets`). Last-registration-wins
is retained, so a plugin or a test can still override the scheme wholesale — but the *intended*
configuration surface is data in `refrakt.config.json`, not code.

## Acceptance Criteria

- [ ] An `asset:<key>` image-src scheme is registered and resolves via project config in `sites.<site>.assets` (`baseUrl`/`pattern` + per-key `overrides`).
- [ ] Resolution follows one rule: per-key override → pattern/baseUrl → shape-correct generated placeholder; bare paths and absolute URLs are untouched and still fall through to `<img>`.
- [ ] With no asset config, `asset:` references render correct-shape placeholders (no broken images, no required manifest); with a `baseUrl` set, the same references render real `<img>`s — no build flag or second code path.
- [ ] Keys carry their own file extension; shape is an optional trailing `@<shape>` (orthogonal to the key path), parsed as "split on the last `@`, suffix is a shape only if it is a known placeholder shape"; absent, the placeholder fallback uses the default shape.
- [ ] {% ref "SPEC-109" /%} templates seed `sites.<site>.assets` at scaffold time from `template.json`; SPEC-109's bespoke demo-build mode is removed in favour of "a `baseUrl` is set."
- [ ] `refrakt.config.schema.json` documents `sites.<site>.assets`; authoring docs cover `asset:` for regular sites.

## Non-goals

- **Not an image pipeline.** No responsive `srcset`/`sizes`, no format negotiation, no
  build-time resizing/transcoding/optimisation. `asset:` resolves to a single URL (or a
  placeholder); anything richer is a separate spec.
- **No asset hosting or upload.** The mechanism only *references* assets; producing and hosting
  them is the author's concern (as in SPEC-109).
- **No new binary-bundling path.** This does not change whether/how real assets ship in a
  template (SPEC-109 keeps the "prefer placeholders, real `assets/` rare" stance).

## Deferred extensions (designed, not built)

### Named roots / multiple hosts

v1 ships a **single** root (`baseUrl`/`pattern`) plus `overrides`. Subfolders need no extra
feature — keys carry `/` (`asset:photos/studio.jpg` → `{baseUrl}photos/studio.jpg`) — and a
handful of off-host assets fit in `overrides`. The only thing one root can't express is several
**distinct hosts** for different asset classes; that is deferred until a concrete need appears,
with this **forward-compatible** design recorded so the door is provably open:

```jsonc
// future shape — additive; baseUrl/pattern become sugar for the default root
"assets": {
  "default": "img",
  "roots": {
    "img":   { "baseUrl": "https://cdn.example.com/img/" },
    "brand": { "baseUrl": "https://assets.example.com/brand/" }
  }
}
```

- The **first key segment selects a root** — `asset:brand/logo.svg` → `brand`. A leading segment
  is a root **only if it is a declared root name**; otherwise it is a path under the `default`
  root (`asset:photos/studio.jpg` → default `img` → `…/img/photos/studio.jpg`). Root names are
  author-defined, so collisions with folder names are the author's to avoid.
- `@shape` is stripped first, then the root is resolved, then the remaining key is substituted.
- It is **purely additive**: today's `baseUrl`/`pattern` is exactly "the default root," so adding
  `roots`/`default` later breaks no v1 config. Per-root merge precedence is folded into the
  merge-precedence question below when this lands.

## Open Questions

- **Merge precedence.** How template-seeded `assets` compose with author edits and with
  theme-level defaults (mirror the `backgrounds` "project over theme, last wins" rule).
- **Interaction with `placeholder:`.** Whether `asset:`'s fallback should literally delegate to
  the `placeholder:` resolver (shared code) or inline `placeholderSvg`.

## References

- Image-scheme registry + dispatch: `packages/runes/src/lib/image-schemes.ts`
  (`registerImageScheme`, `resolveImageScheme`, `SCHEME_RE`).
- Generated placeholders + shapes: `packages/runes/src/lib/placeholder.ts` (`placeholderSvg`,
  `PLACEHOLDER_SHAPES`, `DEFAULT_PLACEHOLDER_SHAPE`).
- Site templates (the original, template-scoped `asset:` + manifest this generalises):
  {% ref "SPEC-109" /%} §4.
- Project-vs-theme config split precedent (`backgrounds`/`sandbox`): {% ref "SPEC-104" /%}.
- Dual-mode asset resolution decision (template framing): ADR-020.

{% /spec %}
