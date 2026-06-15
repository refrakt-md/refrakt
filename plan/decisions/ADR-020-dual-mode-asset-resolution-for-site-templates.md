{% decision id="ADR-020" status="proposed" date="2026-06-15" source="SPEC-109" tags="templates, assets, images, architecture, transform" %}

# Dual-mode asset resolution for site templates

## Context

Site templates ({% ref "SPEC-109" /%}) ship purpose-built example content, and that content
needs images — heroes, avatars, logos, thumbnails. Two requirements pull against each other:

- **A downloaded template must carry no binary assets.** Shipping real images means package
  weight, asset-licensing exposure, and a site that looks broken the moment the author deletes
  the bundled files. The author should get something that renders cleanly with zero extra files.
- **A published preview of the same template should be able to show real, designed imagery.** A
  template author (first- or third-party) will want a live demo that looks finished, not one
  full of grey placeholder boxes.

The same content has to satisfy both. The existing `placeholder:` image scheme
(`packages/runes/src/lib/placeholder.ts`) renders deterministic, token-tinted SVGs and solves
the no-asset case — but it is keyed by *shape* (`placeholder:cover`, `placeholder:avatar`), so
it cannot distinguish two different heroes or map a specific image slot to a specific preview
image. We need a way to reference an image *slot* by stable identity and resolve it differently
depending on build mode.

The enabling fact: the image-scheme registry is already pluggable and last-registration-wins —
`registerImageScheme(scheme, resolver)` in `packages/runes/src/lib/image-schemes.ts`. A build
can swap a resolver wholesale without touching content.

## Options Considered

### 1. Ship real images in the template; optional placeholders

Templates bundle actual image files; authors delete/replace them.

**Pros:** demo and download look identical with no extra machinery.
**Cons:** package weight; asset-licensing exposure travels into every downloaded site; deleting
the bundled images leaves broken `<img>`s; no clean separation between "preview look" and
"starter content." Rejected — it violates the no-binary-assets requirement head-on.

### 2. Reuse `placeholder:` as-is for both modes

Content uses `placeholder:<shape>`; a preview build can't do better than shape-keyed SVGs.

**Pros:** zero new surface.
**Cons:** shape-keyed refs can't map distinct slots to distinct preview images, so the "real
imagery in the demo" requirement is unmet. Rejected — insufficient.

### 3. A logical `asset:` key with a dual-mode resolver (chosen)

Content references an `asset:` slot carrying a **stable key** plus its **aspect shape**. A
template's **asset manifest** (in `template.json`) maps each key to a `previewUrl`. Two
resolvers over identical content:

- **Distributed/scaffold mode (default):** `asset:` resolves to a shape-correct generated
  placeholder, delegating to `placeholderSvg`. `previewUrl`s are not part of the scaffolded
  output, so the downloaded site is automatically placeholder-backed with nothing to strip.
- **Demo-build mode (opt-in flag):** an override resolver (registered last, winning) reads
  `previewUrl` from the manifest and emits a real `<img>`.

Content is byte-identical between modes; only the registered resolver differs.

**Pros:** satisfies both requirements with one additive scheme; rides the existing last-wins
registry; no content change between modes; preview-URL data never ships to authors.
**Cons:** introduces a new scheme and a build-mode flag; requires deciding how shape travels
with the ref (sub-question below).

## Sub-question: how does shape travel with the ref?

For a downloaded site to render a shape-correct placeholder *with no manifest present*, the
slot's aspect must be derivable from the content alone. Two candidate ref syntaxes:

- **A. Self-describing ref** — `asset:<shape>/<key>` (e.g. `asset:cover/hero-main`). Shape is
  in the ref, so a downloaded site needs **zero** extra files; the manifest only adds
  `previewUrl`s, consumed solely in demo mode.
- **B. Key-only ref** — `asset:<key>`, with shape looked up from a manifest copied into the
  scaffolded project.

**Leaning toward A** (self-describing): it best satisfies SPEC-109's "downloaded site needs no
extra files" goal and keeps distributed-mode resolution a pure function of the content. B is
left open only if a compelling reason to centralize per-key metadata emerges. Final syntax is
settled in the SPEC-109 work phase.

## Decision

Adopt **Option 3**: a logical `asset:` image scheme with dual-mode resolution over identical
content — generated placeholders when distributed, author-provided `previewUrl`s under an
opt-in demo-build mode — implemented via the existing last-wins resolver registry. The ref is
expected to be **self-describing for shape** (candidate A), with exact syntax finalized during
implementation.

## Rationale

The two requirements (no binary assets in downloads; real imagery in previews) are
irreconcilable with a single static asset set, but trivially reconciled by making *resolution*
mode-dependent while keeping *content* fixed. The registry already supports exactly this with
no new core mechanism, so the cost is one scheme plus a flag. Keeping `previewUrl`s out of the
scaffolded output means the no-asset and no-licensing-exposure guarantees hold by construction,
not by a cleanup step that could be skipped.

Critically, **how preview images are produced and hosted is entirely out of scope** — the
manifest holds author-provided URLs and nothing about their origin. The repository gains a
neutral capability useful to any template author; it encodes no assumption about a particular
preview pipeline or distribution channel.

## Consequences

- A new core image scheme `asset:` is registered alongside `icon:` and `placeholder:`;
  distributed builds resolve it to generated placeholders, so behaviour for existing content is
  unchanged.
- A build-mode flag (env or config) registers the demo-mode override resolver. It is inert for
  normal site builds.
- `template.json` gains an asset manifest (`key → { shape?, previewUrl, alt? }`); only
  `previewUrl`/`alt` are demo-only, and they are never written into a scaffolded project.
- Template content authoring uses `asset:` for imagery that should be swappable, reserving bare
  `placeholder:` for purely decorative shape fills where identity does not matter.
- The exact `asset:` ref syntax (self-describing vs. key-only) is the one open detail, resolved
  in the SPEC-109 work phase against the "zero extra files in a download" test.

## References

- Site templates spec: {% ref "SPEC-109" /%}.
- Image-scheme registry: `packages/runes/src/lib/image-schemes.ts` (`registerImageScheme`,
  `resolveImageScheme`, last-registration-wins).
- Placeholder generator + shapes: `packages/runes/src/lib/placeholder.ts` (`placeholderSvg`,
  `PLACEHOLDER_SHAPES`).

{% /decision %}
