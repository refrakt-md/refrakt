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
composition model, the asset-manifest seed (the general `asset:` scheme is {% ref "SPEC-115" /%}),
the CLI surface, and optional bundled sandboxes. A small reference template (a test fixture, not
a catalog) backs all of them.

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
2. **Site template** — the content tree + a `SiteConfig` partial + manifest (this spec).
   Supplies the *site*.
3. **Theme** — the template's recommended theme (`site.theme`), or a user override, pinned as a
   dependency.

The template's `site` config is **framework-agnostic** (`plugins`, `routeRules`, `entityRoutes`,
`theme`, …); the scaffolder injects the framework-specific `target` and dependency wiring. This
keeps a template installable across every adapter.

### 2. Template package format and manifest

A full-site template **is a site**, so installing it **adds a site**: its config payload is a
`SiteConfig` (not a partial of the whole `RefraktConfig`), slotted under the target site key. A
site template is a package (or a directory) shaped as:

```
my-template/
  package.json        — template package metadata (may list the theme + plugins for its own CI build)
  template.json       — the template manifest (see below)
  content/            — the content tree: .md pages + _layout.md cascade
  sandboxes/          — optional sandbox program trees (html/css/js/glsl); copied to site.sandbox.dir (§7)
  assets/             — optional real assets (usually empty; prefer the asset scheme, §4)
```

`template.json` is the descriptive contract the scaffolder and any catalog tooling read.
The exact field set is settled in the work phase; the shape is **metadata + a `site` partial**:

```jsonc
{
  // — metadata (catalog; never merged into config) —
  "kind": "site",                                 // "site" (full-site, this spec). "section" is reserved (deferred)
  "name": "docs-starter",
  "title": "Documentation site",
  "description": "A multi-section docs site with sidebar nav, API reference, and changelog.",
  "category": "docs",
  "previewUrl": "https://…",                      // optional: where a built demo is published

  // — the site this template provides: a SiteConfig partial, merged in as a site —
  "site": {
    "contentDir": "site/content",                 // destination; the package's content/ copies here
    "theme": {                                    // recommended look (SiteThemeConfig)
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/tideline"]
    },
    "plugins": ["@refrakt-md/docs", "@refrakt-md/marketing"],
    "routeRules": [{ "pattern": "**", "layout": "docs" }],
    "entityRoutes": [],
    "sandbox": { "dir": "site/sandboxes" },       // destination; the package's sandboxes/ copies here (§7, ADR-022)
    "assets": { /* asset: config — seeds sites.<site>.assets, see §4 + SPEC-115 */ }
  }
}
```

`site` is a partial of `SiteConfig` (`packages/types/src/theme.ts`) — the **same per-site shape**
`refrakt.config.json` uses (`contentDir`, `theme`, `plugins`, `routeRules`, `entityRoutes`,
`backgrounds`, `sandbox`, `assets`, …). Consequences of "a template is a `SiteConfig`":

- **Install = add a site.** The scaffolder slots `site` under the target key — `sites.default`
  (or singular `site`) for a new project, `sites.<name>` for a multi-site add — deep-merged per
  {% ref "SPEC-115" /%}'s rule. The new-project and new-site cases become the same operation.
- **Project-level fields are structurally out of reach.** `plan`, `xrefs`, `fileRoots`, and root
  `plugins` live on `RefraktConfig`, not `SiteConfig`, so a template cannot set them.
- **Dependencies are derived, not declared.** `package.json` deps come from `site.plugins` +
  `site.theme.package`, pinned by the scaffolder — no separate `requiredPlugins` field. `theme`
  reuses `SiteThemeConfig`, so the template ships a complete look (theme + presets + token
  overrides) without a parallel type. (Note `plugins` exists at both levels; a template uses the
  per-site `site.plugins`, and the pinned deps keep discovery working.)
- **`contentDir`/`sandbox.dir` are destinations**, not the package's source folders — the package
  always ships `content/` and `sandboxes/`; these fields say where they land.

The minimal template is just `site.contentDir` + `site.theme`; a fully-composed bundle populates
the rest.

**`kind` is the forward-compatibility hook.** The only value today is `site` (a full-site
template, this spec); it defaults to `site` when omitted. A future **section/page** template
(`kind: "section"`, deferred — see Open Questions) is purely additive: its payload is still a
partial `SiteConfig`, but install *merges it into an existing site* rather than creating one.
Reserving `kind` now means that later addition breaks no existing manifest.

### 3. Scaffold-copy semantics (not a live dependency)

Templates are **copied into the project at scaffold time** and become the author's to edit;
they are not served from `node_modules` (decided in ADR-021). Rationale:

- Content is meant to be rewritten. A live dependency you are supposed to edit is a
  contradiction, and "update the template" becomes an unwinnable merge against changed content.
- It yields a clean distinction from themes: **themes are live dependencies that benefit from
  updates; templates are one-time copies.** A template's ongoing value is "more templates to
  start from," not "this content auto-updates."

The hybrid that makes this ergonomic: a template **pins** its theme and plugins — derived from
its `site` config — as real dependencies (installed into the new project), but **copies** the
content tree and any sandbox programs, and **merges** its `site` config into
`refrakt.config.json`. Deps stay live and updatable; content is owned.

Because templates are copies that reference evolving rune syntax, each first-party template
must be **scaffold-built in CI** — scaffold it, build it, assert no errors — ideally extended
with the visual-regression harness from {% ref "SPEC-094" /%}. This catches rune-syntax drift
breaking a template before an author hits it.

### 4. Asset resolution (templates seed `asset:`, per {% ref "SPEC-115" /%})

Purpose-built content needs images without shipping binaries or looking broken. refrakt handles
this with the project-level **`asset:` scheme** specified in {% ref "SPEC-115" /%}: content
references a logical key (`asset:hero-main.jpg@cover`) that resolves to a real `<img>` when the
project configures a base URL, and to a shape-correct generated placeholder
(`packages/runes/src/lib/placeholder.ts`) otherwise. Templates are a **consumer** of that
mechanism, not a bespoke variant of it:

- A template's **asset config** lives in its `site.assets` (§2) and is seeded into the new
  project's `sites.<site>.assets` like any other `SiteConfig` field; shapes travel in content via
  `@shape` ({% ref "SPEC-115" /%}).
- The scaffolded site ships with **no base URL configured**, so every `asset:` reference renders a
  generated placeholder — zero binary assets, zero licensing surface, nothing to strip. This is
  exactly what the author downloads.
- A template author publishes a fully-imaged **live preview** simply by building with a base URL
  set ({% ref "SPEC-115" /%} §2). There is no separate demo-build flag; "demo mode" is just
  "assets configured."

The ref syntax (`asset:<key>[@<shape>]`) and the resolution rule are owned by
{% ref "SPEC-115" /%}; this spec only requires that a template can **seed** the asset config and
that the placeholder default holds with nothing configured.

### 5. CLI surface

- `create-refrakt --framework <name> --template <purpose>` — the composed scaffold (§1). Both
  default sensibly: `--framework` to the current default adapter, `--template` to the minimal
  starter, preserving today's behaviour.
- Template resolution mirrors theme install: a `--template` value may be a bundled name, a
  local directory, or a package identifier. Install/copy robustness (tarball, alternate
  registries, multi-site targeting) is shared with theme install and specified in
  {% ref "SPEC-110" /%}.
- Publishing a fully-imaged preview needs no special flag: an author builds with the project's
  asset base URL configured ({% ref "SPEC-115" /%}); with none set, builds are placeholder-backed.

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
time from the project's configured sandbox directory (`assembleFromDirectory`,
`packages/runes/src/sandbox-sources.ts`; the directory is configurable via
`sites.<site>.sandbox` — see ADR-022 on its naming). So bundling a sandbox reduces to two
declarative extensions:

- **A program-source tree.** The template package carries a sandbox source directory alongside
  `content/` (the `sandboxes/` folder), scaffold-copied into the project's configured sandbox
  directory under the same author-owned semantics as content (§3). The package's `sandboxes/`
  copies to `site.sandbox.dir`. (These programs are part of the site, not throwaway demos;
  ADR-022 reconsiders the legacy `examples` naming of the runtime directory.)
- **`backgrounds` in the `site` config — only for the named-preset path.** A reusable backdrop
  applied by name (`bg="midnight-waves"`) resolves through `refrakt.config.json →
  sites.<site>.backgrounds` ({% ref "SPEC-104" /%}); `backgrounds` is a `SiteConfig` field, so the
  template's `site` carries it directly. An *inline* `{% sandbox framework="three"
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
- **Templates seed the `asset:` config.** The template's `site.assets` is seeded into
  `sites.<site>.assets` ({% ref "SPEC-115" /%}); with nothing configured, scaffolded sites are
  placeholder-backed and existing content is unaffected.
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
- [ ] A site-template package format is defined: a `template.json` of catalog metadata (name, title, description, category, optional `previewUrl`) plus a `site` field that is a `SiteConfig` partial (`packages/types/src/theme.ts`), and the package ships `content/` (+ optional `sandboxes/`).
- [ ] Installing a template **adds a site**: the scaffolder slots the manifest's `site` `SiteConfig` under the target site key (`sites.default`/singular `site` for a new project, `sites.<name>` for a multi-site add), deep-merged per {% ref "SPEC-115" /%}; it derives and pins `package.json` deps from `site.plugins` + `site.theme.package`, copies `content/`→`site.contentDir` and `sandboxes/`→`site.sandbox.dir`, and injects the framework `target`/wiring.
- [ ] Full-site templates seed a **new project or new site** only — they do not overlay an existing site (that is the deferred section/page-template case).
- [ ] Templates are scaffold-copied (content owned by the author), while the theme and plugins (derived from the `site` config) are pinned as live dependencies of the new project.
- [ ] A template seeds the project's `asset:` configuration ({% ref "SPEC-115" /%}) at scaffold time from `template.json`; with nothing configured the scaffolded site renders shape-correct placeholders (zero binary assets, nothing to strip), and setting a base URL lights up real images with no demo-build flag.
- [ ] Exactly one in-repo reference template exists as a fixture/worked example and is scaffolded-and-built in CI (extended with the {% ref "SPEC-094" /%} visual-regression harness where applicable) to guard against rune-syntax drift.
- [ ] The format supports **bundled sandboxes**: a template may carry a sandbox program-source tree that is scaffold-copied to `site.sandbox.dir`, and its `site` config may carry `backgrounds` entries so a named bg-sandbox preset ({% ref "SPEC-104" /%}) resolves out of the box — introducing no build-time or npm dependency, since the sandbox runtime stays CDN-loaded at activation.
- [ ] Theme-authoring/scaffolding docs gain a template-authoring guide covering the manifest, the framework × purpose model, scaffold-copy semantics, the `asset:` scheme, and bundling a sandbox.

## Open Questions

- **CLI override precedence.** When the author passes `--theme` (or other flags), it overrides the
  template's `site.theme`; confirm "CLI > template `site` > theme defaults" and how presets/token
  overlays compose. (Because full-site templates seed a *fresh* site, there is no template-vs-
  existing-config merge here — that only arises for section/page templates, below.)
- **Section/page templates.** Full-site only here; a "drop in a pricing page" granularity (a
  partial template overlaid onto an *existing* site) is deferred under the reserved
  `kind: "section"` (§2). That case **owns the merge-into-existing story** — per-field for scalars,
  per-key deep-merge for map fields like `overrides`/`backgrounds`, author wins — and the
  install-side apply-mode ("merge into the `--site` you select" vs. full-site "name a new site"),
  both kept forward-compatible by {% ref "SPEC-110" /%}. Out of scope for v1.
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
- Project asset resolution (the general `asset:` scheme this seeds): {% ref "SPEC-115" /%}.
- Image schemes: `packages/runes/src/lib/image-schemes.ts` (`registerImageScheme`,
  `resolveImageScheme`), `packages/runes/src/lib/placeholder.ts` (`placeholderSvg`,
  `PLACEHOLDER_SHAPES`).
- Theme system foundations (gallery/harness, fonts, layouts): {% ref "SPEC-094" /%}.
- Sandbox rune + runtime: `packages/runes/src/tags/sandbox.ts`, `packages/runes/src/sandbox-sources.ts`
  (`assembleFromDirectory`), `packages/behaviors/src/elements/sandbox.ts` (CDN framework presets,
  `data-dependencies`, iframe CSP).
- Live sandbox guests + named sandbox presets in `backgrounds`: {% ref "SPEC-104" /%}.
- Media runes / audio bridge (audio-visualisation synergy): {% ref "SPEC-006" /%}.
- Sandbox directory naming (`examples` → `sandboxes`): ADR-022.
- Framework-agnostic theme packages: ADR-009.
- Scaffold-copy vs. live-dependency decision: ADR-021.
- Dual-mode asset resolution decision: ADR-020.
- Shared install robustness (tarball, registries, multi-site, templates): {% ref "SPEC-110" /%}.

{% /spec %}
