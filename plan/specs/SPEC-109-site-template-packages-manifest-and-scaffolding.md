{% spec id="SPEC-109" status="draft" tags="templates,scaffolding,distribution,cli,dx" %}

# Site template packages, manifest, and scaffolding

Starting a refrakt site is a near-blank-page experience. `create-refrakt` scaffolds a
project whose content tree is three files — an `index.md`, one `docs/getting-started.md`,
and a `_layout.md` — wired to `plugins: ['@refrakt-md/marketing']` and a single
`** → default` route rule. The framework starters that back this (`template-html`,
`template-astro`, `template-next`, …) are keyed by **framework**: they decide *which
adapter* the project runs on, not *what kind of site* it is. There is no way to start
from a complete, purpose-built site — a docs site, an API reference, a changelog, a
portfolio, a product landing page — already filled in and wired to the plugins and
layouts that brief needs.

That blank page is the largest activation cost in the toolchain. An author who wants "a
documentation site" has to discover the docs plugin exists, learn its runes, assemble a
layout cascade, and write every page from scratch before seeing anything that looks
designed. The runes, themes, and plugins to build these sites all exist; what is missing
is a distributable unit that *composes* them into a finished starting point.

This spec defines **site templates**: installable, purpose-built site scaffolds, the
package format and manifest that describe them, and the `create-refrakt` changes that
compose a template with a framework and a theme into a working project. It is
infrastructure — the same mechanism serves first-party and third-party template authors
equally, and nothing here assumes any particular distribution channel.

## The four-layer model

Templates slot cleanly into refrakt's existing layering and make the whole stack legible:

| Layer | What it is | Distribution today |
|-------|------------|--------------------|
| **Plugin** | Vocabulary — the runes you can write (`{% api %}`, `{% pricing %}`) | npm package, live dependency |
| **Template** | A *site written in that vocabulary, for a purpose* — content tree + route/entity wiring + plugin set | **(this spec)** |
| **Theme** | How it looks — tokens, skin, components ({% ref "SPEC-094" /%}) | npm package, live dependency |
| **Preset** | A palette variation of a theme | module export, merged data |

A template **hard-depends on plugins** (its content literally uses their runes — they must
exist or the build breaks) and **soft-depends on themes** (it must *render correctly* under
any theme, but only *looks designed* under the ones it was authored against). That
asymmetry is the contract: **works with any theme, sings with its recommended theme.** It
is a first-class fact in the manifest, not an accident.

## Problem evidence

Measured against the current `packages/create-refrakt` tree:

- **One axis, overloaded.** `--type site` + the `template-<framework>` directories conflate
  *framework choice* with *starting content*. `scaffoldSite` copies a framework starter and
  generates a config from `generateRefraktConfig(theme, target)` — there is no seam for "and
  also lay down this purpose-built content + plugin/route wiring."
- **Starters are empty by construction.** `template-html/content/` is three files. The
  starters exist to prove the adapter boots, not to give an author a running start. There is
  no richer content anywhere to scaffold from.
- **No template format exists.** There is a theme scaffold (`scaffoldTheme`) and a theme
  manifest (`ThemeManifest` in `packages/types/src/theme.ts`), but no analogous notion of a
  packaged, describable *site template* — no manifest, no required-plugin declaration, no
  recommended-theme field, no install path.
- **Example content can't ship cheaply.** Purpose-built content needs images — heroes,
  avatars, logos. Shipping binaries means weight and asset-licensing exposure, and a template
  that looks broken the moment the author deletes the bundled images. The `placeholder:` image
  scheme (`packages/runes/src/lib/placeholder.ts`) solves the no-asset case but is keyed by
  *shape*, not *identity*, so it cannot also drive a richer live preview of the same content.

## Design

The work divides into five pieces: the package format and manifest, the scaffold-time
composition model, the dual-mode asset scheme, the CLI surface, and optional bundled
sandboxes. A small reference template (a test fixture, not a catalog) backs all of them.

### 1. Two axes: framework × purpose

Framework and purpose are orthogonal — a docs template should be installable on SvelteKit
*or* Astro. The current single `--template`-as-framework overload is split:

- **`--framework <name>`** selects the adapter (svelte/astro/next/nuxt/eleventy/html). This
  is today's `template-<framework>` choice, renamed to what an author actually thinks they
  are choosing. ("Adapter" is the internal package term; "framework" is the author-facing
  one.) The existing `--type`/`--target` plumbing is reconciled onto this flag.
- **`--template <name>`** (the freed-up flag) selects the **purpose** — the site template to
  scaffold from. Absent, it falls back to today's minimal starter, so existing behaviour is
  preserved.

Scaffolding then **composes three inputs**:

1. **Framework starter** — app shell, build files, base `package.json` (today's
   `template-<framework>` dirs). Supplies the adapter wiring.
2. **Site template** — the content tree + a config fragment + manifest (this spec). Supplies
   the *site*.
3. **Theme** — the template's recommended theme, or a user override, pinned as a dependency.

The template's config fragment is **framework-agnostic** (plugins, `routeRules`,
`entityRoutes`, recommended theme); the scaffolder injects the framework-specific `target`
and dependency wiring. This keeps a template installable across every adapter.

### 2. Template package format and manifest

A site template is a package (or a directory) shaped as:

```
my-template/
  package.json        — name, version; deps: recommended theme + required plugins
  template.json       — the template manifest (see below)
  content/            — the content tree: .md pages + _layout.md cascade
  sandboxes/          — optional sandbox program trees (html/css/js/glsl); scaffold-copied → site/examples/ (§7)
  assets/             — optional real assets (usually empty; prefer the asset scheme, §3)
```

`template.json` is the descriptive contract the scaffolder and any catalog tooling read.
The exact field set is settled in the work phase; the shape is:

```jsonc
{
  "name": "docs-starter",
  "title": "Documentation site",
  "description": "A multi-section docs site with sidebar nav, API reference, and changelog.",
  "category": "docs",
  "contentDir": "./content",
  "requiredPlugins": ["@refrakt-md/docs"],     // hard dependency — runes must resolve
  "recommendedTheme": {                          // soft dependency — the designed look
    "package": "@refrakt-md/lumina",
    "presets": ["@refrakt-md/lumina/presets/tideline"]
  },
  "configFragment": {                            // merged into the generated refrakt.config
    "plugins": ["@refrakt-md/docs", "@refrakt-md/marketing"],
    "routeRules": [{ "pattern": "**", "layout": "docs" }],
    "entityRoutes": []
  },
  "previewUrl": "https://…",                     // optional: where a built demo is published
  "assets": { /* asset manifest — see §3 */ },
  "sandboxes": { /* program-tree → project-dir mapping — see §7 */ }
}
```

`recommendedTheme` reuses the `SiteThemeConfig` shape from `packages/types/src/theme.ts`
(`{ package, presets, tokens, modes, colorScheme }`) so a template ships a **complete
starting configuration** — a template + theme + preset + token overrides composed into one
unit — without inventing a parallel type. A template with only `requiredPlugins` and a
neutral theme is the minimal case; a fully-composed bundle is the same field set populated.

### 3. Scaffold-copy semantics (not a live dependency)

Templates are **copied into the project at scaffold time** and become the author's to edit;
they are not served from `node_modules` (decided in ADR-021). Rationale:

- Content is meant to be rewritten. A live dependency you are supposed to edit is a
  contradiction, and "update the template" becomes an unwinnable merge against changed content.
- It yields a clean distinction from themes: **themes are live dependencies that benefit from
  updates; templates are one-time copies.** A template's ongoing value is "more templates to
  start from," not "this content auto-updates."

The hybrid that makes this ergonomic: a template **pins** its recommended theme and required
plugins as real dependencies (installed into the new project) but **copies** only the content
tree and the merged config fragment. Deps stay live and updatable; content is owned.

Because templates are copies that reference evolving rune syntax, each first-party template
must be **scaffold-built in CI** — scaffold it, build it, assert no errors — ideally extended
with the visual-regression harness from {% ref "SPEC-094" /%}. This catches rune-syntax drift
breaking a template before an author hits it.

### 4. Dual-mode asset resolution

The resolution model and its tradeoffs are decided in ADR-020; this section summarizes it.
Example content needs images without shipping binaries or looking broken. The image-scheme
registry is already pluggable — `registerImageScheme(scheme, resolver)`, last-registration-wins
(`packages/runes/src/lib/image-schemes.ts`). That makes two resolution modes over *identical*
content nearly free:

- **Distributed/scaffold mode (default).** Content references logical image slots that resolve
  to the built-in generated `placeholder:` SVGs (`packages/runes/src/lib/placeholder.ts`). Zero
  binary assets, zero asset-licensing surface. This is exactly what the author downloads, and
  it renders cleanly with no extra files.
- **Demo-build mode (opt-in).** A build flag registers an override resolver that maps the *same*
  slots to author-provided hosted image URLs, so a template author can publish a live, fully-
  imaged preview of their template. Content is byte-identical between modes; only the resolver
  differs.

The one wrinkle: `placeholder:` is keyed by *shape*, so it cannot tell two heroes apart or map
them to distinct preview images. The fix is a **logical asset key** — content references an
`asset:` slot carrying a stable key and its aspect shape; a template's **asset manifest**
(in `template.json`) maps each key to a `previewUrl`. The exact ref syntax is an open decision
(candidates: `asset:hero-main` with shape resolved from the manifest, vs. a self-describing
`asset:cover/hero-main` so a downloaded site needs no manifest at all — see Open Questions).
Either way:

- In distributed mode the slot emits a shape-correct generated placeholder (delegating to
  `placeholderSvg`); the `previewUrl` values are **not** part of the scaffolded output, so the
  author's downloaded site is automatically placeholder-backed with nothing to strip.
- In demo mode the override resolver reads `previewUrl` from the manifest and emits a real
  `<img>`.

How preview URLs are produced and hosted is an operational concern entirely outside this
spec and the repo; the manifest only ever holds author-provided URLs.

### 5. CLI surface

- `create-refrakt --framework <name> --template <purpose>` — the composed scaffold (§1). Both
  default sensibly: `--framework` to the current default adapter, `--template` to the minimal
  starter, preserving today's behaviour.
- Template resolution mirrors theme install: a `--template` value may be a bundled name, a
  local directory, or a package identifier. Install/copy robustness (tarball, alternate
  registries, multi-site targeting) is shared with theme install and specified in
  {% ref "SPEC-110" /%}.
- A demo-build flag (env or config) toggles asset demo mode (§4) for authors publishing a
  preview. It is inert for normal builds.

### 6. Reference template (test fixture)

Ship **exactly one** template in-repo, framed as a fixture and worked example — not a catalog.
It earns its place three ways: it is what CI scaffolds-builds-(and visually regresses) to prove
the mechanism end-to-end; it is the canonical example third-party authors copy to learn the
format; and it dogfoods the manifest. Keep it deliberately generic (a plain multi-section
starter), so its presence implies a *format*, not a *content library*. Whether to grow beyond
one in-repo template is explicitly out of scope here.

### 7. Bundled sandboxes (runtime-bearing templates)

Some templates only *sing* with a live program — a music blog whose playlist cover is a
three.js audio visualizer ({% ref "SPEC-104" /%}), a data template with a chart sandbox. A
template should be able to ship that working out of the box, so an author who picks "music
blog" gets the visualizer, not a TODO to build their own.

This costs almost nothing on top of §2–§3, because **a sandbox is not a build dependency.**
Its runtime is CDN-loaded inside a sandboxed iframe at activation: the `framework` attribute
maps to a CDN preset (tailwind/pico/bootstrap/bulma) and `dependencies` is a list of CDN URLs
(three.js, etc.), with the iframe CSP derived from those URLs
(`packages/behaviors/src/elements/sandbox.ts`). There is no `npm install`, no `node_modules`,
no bundling — both the framework provider and the dependency URLs are inert declarative strings
that travel inside the copied content/config for free.

What a sandbox *does* carry is **program files** — `html`/`css`/`js`/`glsl` scanned at build
time from a project directory (`assembleFromDirectory`, `packages/runes/src/sandbox-sources.ts`),
e.g. `site/examples/midnight-waves/`. So bundling a sandbox reduces to two declarative
extensions:

- **A program-source tree.** The template package carries a sandbox source directory alongside
  `content/` (e.g. `sandboxes/`), scaffold-copied into the project (→ `site/examples/…`) under
  the same author-owned semantics as content (§3). The manifest's `sandboxes` field records
  where each tree lands.
- **`backgrounds` in the config fragment — only for the named-preset path.** A reusable backdrop
  applied by name (`bg="midnight-waves"`) resolves through `refrakt.config.json →
  sites.<site>.backgrounds` ({% ref "SPEC-104" /%}), so `configFragment` must be allowed to carry
  `backgrounds`/`sites.<site>` keys. An *inline* `{% sandbox framework="three"
  dependencies="…" %}` needs nothing beyond being ordinary content.

The distinction this surfaces is **content-only vs. runtime-bearing** templates — not a
*dependency* split (there is no install), but a capability one: a runtime-bearing template's
hero only animates if the CDN is reachable and the CSP permits its origins, both of which are
self-contained in the copied output. The in-repo reference template (§6) stays content-only and
generic; a sandbox-bearing template (e.g. the music-blog visualizer) is a downstream artifact
that proves the capability, not something shipped in-repo.

## Implications

- **`create-refrakt` gains a composition step.** Scaffolding moves from "copy one framework
  starter + generate config" to "compose framework starter + template content + theme dep +
  merged config." The framework axis rename touches the bin's flag parsing and docs.
- **A new image scheme + build mode.** `asset:` and the demo-mode resolver are additive to the
  registry; no existing content changes. Distributed builds behave exactly as today.
- **Templates are CI-built artifacts.** Each first-party template is scaffolded and built in CI,
  reusing the {% ref "SPEC-094" /%} gallery/harness where possible, so rune-syntax drift can't
  silently rot a template.
- **No coupling to a distribution channel.** Templates resolve as bundled names, directories, or
  packages via the shared install surface ({% ref "SPEC-110" /%}); the format presumes nothing
  about where templates come from.
- **Runtime-bearing templates are additive.** A template may bundle a sandbox program tree
  (scaffold-copied) and `backgrounds` config (§7); this introduces no new dependency machinery —
  the sandbox runtime stays CDN-loaded at activation — so content-only templates are unaffected.

## Acceptance Criteria

- [ ] `create-refrakt` separates the framework axis (`--framework`) from the purpose axis (`--template`), with both defaulting to preserve current behaviour; the existing `--type`/`--target` plumbing is reconciled onto `--framework` and documented.
- [ ] A site-template package format is defined: a `template.json` manifest (name, title, description, category, `contentDir`, `requiredPlugins`, `recommendedTheme` as a `SiteThemeConfig`, `configFragment`, optional `previewUrl` + asset manifest) plus a `content/` tree.
- [ ] Scaffolding composes three inputs — framework starter, site template, theme — copying the template's content and merging its framework-agnostic `configFragment` into the generated `refrakt.config.json`, with the framework `target` and dependency wiring injected by the scaffolder.
- [ ] Templates are scaffold-copied (content owned by the author), while the recommended theme and required plugins are pinned as live dependencies of the new project.
- [ ] An `asset:` logical-key image scheme renders shape-correct generated placeholders in distributed/scaffold mode (zero binary assets, no manifest required in the downloaded site) and resolves to author-provided `previewUrl`s under an opt-in demo-build mode via the last-wins resolver registry.
- [ ] Exactly one in-repo reference template exists as a fixture/worked example and is scaffolded-and-built in CI (extended with the {% ref "SPEC-094" /%} visual-regression harness where applicable) to guard against rune-syntax drift.
- [ ] The format supports **bundled sandboxes**: a template may carry a sandbox program-source tree that is scaffold-copied into the project (→ `site/examples/…`), and its `configFragment` may carry `backgrounds`/`sites.<site>` entries so a named bg-sandbox preset ({% ref "SPEC-104" /%}) resolves out of the box — introducing no build-time or npm dependency, since the sandbox runtime stays CDN-loaded at activation.
- [ ] Theme-authoring/scaffolding docs gain a template-authoring guide covering the manifest, the framework × purpose model, scaffold-copy semantics, the `asset:` scheme, and bundling a sandbox.

## Open Questions

- **`asset:` ref syntax.** Self-describing (`asset:<shape>/<key>`, so a downloaded site needs no
  manifest) vs. key-only (`asset:<key>`, shape resolved from a copied manifest). Settle in the
  work phase against the "downloaded site needs zero extra files" goal.
- **Config-fragment merge precedence.** How a template's `configFragment` composes with
  user-supplied flags and with the recommended-theme override (template default vs. explicit
  `--theme`) when they conflict.
- **Section/page templates.** Full-site only here; whether a "drop in a pricing page" granularity
  is a later refinement of the same format (a one-page template) is deferred.
- **Out-of-the-box runtime for bundled sandboxes.** A bundled sandbox (§7) animates only if its
  CDN dependencies are reachable and the iframe CSP permits them. Decide what "works out of the
  box" promises — a documented runtime-network expectation, an optional self-hosted/vendored
  dependency path, and whether CI's offline scaffold-build (no activation) suffices or a
  live/visual check is required. Coordinates with {% ref "SPEC-104" /%} and the audio bridge
  ({% ref "SPEC-006" /%}).

## References

- Scaffolding today: `packages/create-refrakt/src/scaffold.ts` (`scaffoldSite`, `scaffoldTheme`,
  `generateRefraktConfig`), `packages/create-refrakt/src/bin.ts`, the `template-<framework>` dirs.
- Theme manifest + site theme config: `packages/types/src/theme.ts` (`ThemeManifest`,
  `SiteThemeConfig`, `getThemePackage`).
- Image schemes: `packages/runes/src/lib/image-schemes.ts` (`registerImageScheme`,
  `resolveImageScheme`), `packages/runes/src/lib/placeholder.ts` (`placeholderSvg`,
  `PLACEHOLDER_SHAPES`).
- Theme system foundations (gallery/harness, fonts, layouts): {% ref "SPEC-094" /%}.
- Sandbox rune + runtime: `packages/runes/src/tags/sandbox.ts`, `packages/runes/src/sandbox-sources.ts`
  (`assembleFromDirectory`), `packages/behaviors/src/elements/sandbox.ts` (CDN framework presets,
  `data-dependencies`, iframe CSP).
- Live sandbox guests + named sandbox presets in `backgrounds`: {% ref "SPEC-104" /%}.
- Media runes / audio bridge (audio-visualisation synergy): {% ref "SPEC-006" /%}.
- Framework-agnostic theme packages: ADR-009.
- Scaffold-copy vs. live-dependency decision: ADR-021.
- Dual-mode asset resolution decision: ADR-020.
- Shared install robustness (tarball, registries, multi-site, templates): {% ref "SPEC-110" /%}.

{% /spec %}
