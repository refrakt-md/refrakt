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

`asset:` is a registered image-src scheme like `icon:`/`placeholder:`. Its resolver reads a
project asset configuration declared under `sites.<site>.assets` in `refrakt.config.json`
(threaded onto the Markdoc `config.variables`, alongside `__icons`):

```jsonc
// refrakt.config.json → sites.<site>.assets
{
  "baseUrl": "https://cdn.example.com/images/",
  "pattern": "{baseUrl}{key}.webp",        // how a key becomes a URL; {baseUrl}/{key} substituted
  "overrides": {                            // optional per-key escape hatch
    "cover-article-1": "https://cdn.example.com/special/hero.webp"
  }
}
```

- **`baseUrl` / `pattern`** turn any key into a URL by substitution. `pattern` defaults to
  `{baseUrl}{key}` so the simplest config is just a `baseUrl`. (Extension handling is an Open
  Question.)
- **`overrides`** map specific keys to explicit URLs, for the assets that don't fit the pattern.
- The config is **project-level** (`sites.<site>.assets`), following the project-vs-theme split
  already used for `backgrounds`/`sandbox` ({% ref "SPEC-104" /%}); a template seeds it (§4).

### 2. The single resolution rule (subsumes "demo mode")

`asset:<key>` resolves by one rule, evaluated at transform time:

1. If `overrides[key]` exists → emit an `<img>` to that URL.
2. Else if a `baseUrl`/`pattern` is configured → substitute and emit an `<img>`.
3. Else → emit a **shape-correct generated placeholder** (`placeholderSvg`), using the key's
   declared/derived shape (§3).

Bare paths and absolute URLs are unaffected — they never match the `asset:` scheme and fall
through to `<img>` exactly as today, so authors mix `asset:` keys and literal `src`s freely.

This rule **collapses {% ref "SPEC-109" /%}'s two modes into one.** "Distributed mode" is just
*no asset config present* → placeholders. "Demo mode" is just *a `baseUrl` is set* → real images.
There is no separate demo-build flag and no second code path: the same content renders
placeholders or real images purely as a function of config. A freshly scaffolded site ships with
no `baseUrl`, so it is placeholder-backed and never broken; the author adds their `baseUrl` and
every `asset:` reference lights up at once.

### 3. Shape metadata and self-describing keys

The placeholder fallback (rule 3) needs to know a key's aspect shape (`cover`, `avatar`, …). Two
candidate ref syntaxes — the same open decision {% ref "SPEC-109" /%} raised, now owned here:

- **Self-describing key — `asset:<shape>/<key>`** (e.g. `asset:cover/article-1`). The shape rides
  in the reference, so the placeholder fallback works with **zero config and zero manifest** — a
  downloaded or forked site renders correct-shape placeholders out of the box. Favoured by the
  "needs no extra files" goal.
- **Key-only — `asset:<key>`** with shape looked up from an `assets` map. Cleaner references, but
  the shape (and so a graceful fallback) depends on a config/manifest being present.

Either way, when a URL resolves (rules 1–2) the shape is advisory only; it matters for the
no-URL fallback.

### 4. Relationship to templates ({% ref "SPEC-109" /%})

A template's `template.json` **asset manifest** becomes a **scaffold-time seed**: at scaffold the
manifest's entries (keys → shapes, and any author-published `previewUrl`s) merge into the new
project's `sites.<site>.assets`, exactly the way the template's `configFragment`,
`backgrounds`, and `sandbox` config already merge. After that, resolution is the §2 rule like any
other site. Consequences:

- The template author's "publish a live preview" flow is just *building with a `baseUrl` set* — no
  bespoke demo-build flag (SPEC-109 §4/§5 lose it; they defer to this spec).
- The scaffolded site ships with shapes but **no `baseUrl`**, so it is placeholder-backed with
  nothing to strip — preserving SPEC-109's "zero binary assets, nothing to delete" guarantee.

### 5. Registry integration

`asset:` registers through the existing `registerImageScheme('asset', resolver)`; the resolver
reads `config.variables.__assets` (populated from `sites.<site>.assets`). Last-registration-wins
is retained, so a plugin or a test can still override the scheme wholesale — but the *intended*
configuration surface is data in `refrakt.config.json`, not code.

## Acceptance Criteria

- [ ] An `asset:<key>` image-src scheme is registered and resolves via project config in `sites.<site>.assets` (`baseUrl`/`pattern` + per-key `overrides`).
- [ ] Resolution follows one rule: per-key override → pattern/baseUrl → shape-correct generated placeholder; bare paths and absolute URLs are untouched and still fall through to `<img>`.
- [ ] With no asset config, `asset:` references render correct-shape placeholders (no broken images, no required manifest); with a `baseUrl` set, the same references render real `<img>`s — no build flag or second code path.
- [ ] The ref syntax for shape (self-describing `asset:<shape>/<key>` vs. key-only + map) is decided and documented.
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

## Open Questions

- **Extension handling in `pattern`.** `{key}` + a fixed extension, vs. keys that carry their own
  extension (`asset:cover-article-1.webp`), vs. per-key override only. Mixed-format sites push
  toward keys-carry-extension or overrides.
- **Shape ref syntax.** Self-describing `asset:<shape>/<key>` vs. key-only with a shape map
  (shared decision pulled in from {% ref "SPEC-109" /%}; weighted toward self-describing for the
  zero-config fallback).
- **Namespaces / multiple roots.** Whether a single `baseUrl` suffices or `asset:photos/…` vs.
  `asset:icons/…` should resolve via distinct roots. Start with one root + overrides; revisit if
  demand appears.
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
