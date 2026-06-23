{% spec id="SPEC-111" status="accepted" tags="presets,tokens,distribution,packaging,syntax,tints" %}

# Decoupled preset packs with scope and compatibility metadata

A preset is already pure, theme-agnostic data — a `ThemeTokensConfig` of token overrides,
merged last-wins over a theme's base values and validated against the **universal** token
contract ({% ref "SPEC-048" /%}). The preset loader (`packages/transform/src/preset-loader.ts`)
resolves an entry from *any* module identifier — a package path (`@refrakt-md/lumina/presets/tideline`)
or a relative path (`./presets/my-warm`) — and nothing in resolution assumes the preset lives in
the active theme's package. The mechanism is theme-independent today.

What is coupled is **packaging** and **curation**, not architecture. Every shipped preset lives
inside `@refrakt-md/lumina` (`packages/lumina/src/presets/*`, surfaced through Lumina's
`package.json` exports). There is no way to ship presets as a standalone unit, no machine-readable
description of what a preset *is* (does it only retint syntax, or does it reskin the whole page?),
no declaration of which themes it was tuned for, and no way to discover or list presets except by
reading one theme's exports.

This spec makes presets a first-class **distributable pack** with **scope** and **compatibility**
metadata, so any theme can consume any compatible preset, authors can ship preset collections
independent of a theme, and tooling can list and filter presets by fit. It is packaging,
metadata, and tooling — no engine or token-merge change.

## Background: presets already carry a scope, implicitly

The codebase already distinguishes two preset classes by what tokens they touch — it just doesn't
name it on the preset itself:

- **Foreground / syntax-scoped** (e.g. `niwaki`): sets only `syntax.*`. Theme-universal — composes
  with any chrome.
- **Integrated / palette** (e.g. `nord`, `tideline`): also claims chrome tokens (`color.bg`,
  `color.surface`, `color.text`, `color.primary`) and code-surface tokens. Reskins the whole page;
  tuned to a specific canvas.

When a preset is projected as a **scoped tint** ({% ref "SPEC-056" /%}'s tint-as-preset
mechanism), `filterScopeEligible` in `packages/transform/src/token-stylesheet.ts` already drops
non-eligible namespaces (typography, spacing, radius, shadow, structural sentiments), enforcing
*"tints scope mood; presets scope skeleton."* So the engine already classifies which tokens are
"mood" (colour/syntax — universally projectable) versus "skeleton" (structural — theme-bound).
This spec surfaces that latent distinction as an explicit, validated property of a preset, rather
than something only computed at tint-projection time.

## Problem evidence

- **Presets are welded to a theme package.** All nine presets live under `packages/lumina/src/presets/`
  and are reachable only via `@refrakt-md/lumina/presets/*`. A preset is `ThemeTokensConfig` data
  that the loader would happily resolve from anywhere, but there is no packaged unit other than a
  theme to ship them in.
- **A preset's scope is undeclared.** Whether a preset is safe to apply to *any* theme
  (syntax-only) or reskins chrome (integrated) is discoverable only by reading the module source
  and seeing which token namespaces it sets. `merge.ts` even comments that "most syntax-only
  presets … return empty objects" for chrome — the distinction is real but informal.
- **No compatibility signal.** An integrated preset is tuned to a canvas/structure; nothing records
  which theme(s) it was designed against, so neither an author nor tooling can warn when a preset
  is applied to a theme it will visually fight.
- **No discovery.** `refrakt theme info` reports the active theme; there is no way to list available
  presets, let alone filter them by the active theme's compatibility or by scope.
- **Curation is implicit and lossy.** "Which presets suit this theme" lives only in prose docstrings
  (e.g. Nord's comment explaining its integrated stance), not in data any tool can act on.

## Design

### 1. Preset-pack package format

A **preset pack** is a package (independent of any theme) that exports one or more
`ThemeTokensConfig` modules plus a manifest describing them. Shape:

```
my-presets/
  package.json        — name, version; exports map for each preset module
  presets.json        — the pack manifest (see §3)
  src/midnight.json   — a ThemeTokensConfig (declarative JSON, the default — see §6)
  src/aurora.json     — …
```

Each preset is exactly today's `ThemeTokensConfig` — **no change to the preset data shape**, so
Lumina's existing presets are already valid pack members. A preset travels in one of two
**carrier formats** (§6): a declarative `.json` file (the default) or a JS/TS module with a
`default`/`config` export (Lumina's current form). The loader resolves pack entries by the same
module-identifier path it uses now; a pack is simply a package whose reason for existing is
presets, not a theme.

Lumina's in-package presets remain exported for backwards compatibility; the pack format is the
forward path and does not require presets to live in a theme.

**Packs are a capability a package *adds*, not a `kind` it *becomes*.** A package may provide
several capabilities at once: Lumina is a theme that *also* ships a preset pack — it exports
`./transform` (the theme contract) and nine `./presets/*`. So a `presets.json` sits alongside a
theme's `ThemeManifest`/exports without conflict, and Lumina becomes a theme that additionally
declares a preset pack — no migration of `ThemeManifest` and no single cross-artifact `kind`
discriminator (which couldn't express "theme **and** preset pack" anyway). Distributable-unit
discovery scans for each capability independently — theme contract, `template.json`
({% ref "SPEC-109" /%}), `presets.json` — rather than reading one unified manifest.

### 2. Scope as a first-class, validated property

Each preset declares a `scope`:

- **`syntax`** — touches only `syntax.*` (and optionally `color.code.*`). Theme-universal by
  construction.
- **`palette`** — also claims chrome tokens (`color.bg`, `surface`, `text`, `muted`, `border`,
  `primary`). Reskins the page; tuned to a canvas.

Scope is validated against the same eligibility classification `filterScopeEligible` already uses:
a preset declared `syntax` that sets chrome tokens is a validation warning (it is really a
`palette` preset). This makes the universal-vs-tuned distinction a checkable fact, and lets tooling
reason about a preset without parsing its values. It also aligns the pack metadata with the
existing tint-projection boundary — a `syntax` preset is exactly the class that projects cleanly as
a scoped tint.

**Two buckets, not more.** `syntax` | `palette` mirrors the engine's binary mood-vs-skeleton
boundary (`filterScopeEligible`), and there is no consumer today for finer gradation (e.g.
claims-code-surface-only vs. full-chrome). Finer sub-scopes are deferred; because `scope` is a
string the validator checks against actual tokens, adding values later is additive — nothing
breaks.

### 3. Compatibility metadata

The pack manifest is a standalone **`presets.json`** file (parallel to `template.json`), and it
records, per preset, a stable `id`, a human `title`, the `scope`, the `module` path, and an optional
advisory `tunedFor` list. `scope` lives **in the manifest entry** — not as a module export — so
discovery can list and filter without importing/transpiling every preset module; validation (§4)
cross-checks the declared `scope` against the module's actual token namespaces, catching drift. The
shape:

```jsonc
{
  "name": "@example/midnight-presets",
  "refrakt": ">=0.24 <0.26",            // compatible refrakt range, validated at install (ADR-023)
  "presets": [
    { "id": "midnight",  "title": "Midnight",  "scope": "palette",
      "module": "./src/midnight.js", "tunedFor": ["@refrakt-md/lumina"] },
    { "id": "ember-syntax", "title": "Ember",  "scope": "syntax",
      "module": "./src/ember.js" }    // no tunedFor → universal
  ]
}
```

Compatibility is **advisory**: absence means "universal," and applying a preset outside its
`tunedFor` set is never an error (the universal token contract guarantees it degrades to
"recolours but keeps the theme's geometry," never breakage). It exists so authors and tooling can
express and surface recommended pairings, and so a theme can ship a curated collection that travels
as metadata rather than as a hard packaging lock.

Compatibility is recorded **on the preset** (`tunedFor` → themes): the preset author knows which
canvas they tuned against. The inverse — a theme advertising recommended packs — is a derivable
index, deferred; adding it later is additive and does not change the preset-side primitive.

### 4. Discovery and validation tooling

- **Install rides the shared resolver ({% ref "SPEC-110" /%}).** A preset pack resolves from a
  directory, tarball, or registry through the *same* helper as themes and templates; its *apply* is
  the lightest of the three artifacts — add the dependency and validate `presets.json`, optionally
  appending the chosen preset to `site.theme.presets`. No scaffold-copy, no site creation. It is the
  third row in SPEC-110's `kind`-keyed apply table.
- `refrakt theme presets list` — list presets resolvable from the project's installed packs and the
  active theme, filterable by `--scope` and by compatibility with the active theme (universal
  presets always shown; `palette` presets flagged when outside their `tunedFor` set).
- Pack-manifest validation — verify each declared `module` resolves, each preset's actual token
  namespaces match its declared `scope`, and `tunedFor` entries are well-formed. Folds into the
  existing config/theme validation surface.

### 5. Presets double as tints — for free

Because a preset module is already projectable as a **scoped tint** via `tints[].extends`
({% ref "SPEC-056" /%}, {% ref "SPEC-053" /%}), a preset pack is simultaneously a tint pack: the
same module powers a site-wide reskin (`theme.presets`) or a scoped accent subtree
(`tints[].extends`). `filterScopeEligible` already guarantees a preset used as a tint can only
project mood, never structure — so `scope` metadata and tint-eligibility are the same boundary
viewed from two directions. This spec documents the dual role; no new mechanism is required.

### 6. Declarative JSON carrier + schema

A preset is **pure data** — every shipped preset (`packages/lumina/src/presets/*`) is a typed
object literal of string token values, with no functions, spreads, imports beyond the type, or
computation. The `.ts` form buys only author-time typing. So a preset can be carried as plain
**JSON**, and that is the **default** carrier for new packs:

- **Carrier-agnostic resolution.** A preset entry's `module` may resolve to a `.json` file *or* a
  JS/TS module. The loader (`preset-loader.ts`) detects `.json` by extension and reads it
  (`readFile` + `JSON.parse`) instead of `import()`-ing it; both yield the same
  `ThemeTokensConfig`. This satisfies the loader's existing "resolved export must be a plain
  object" guard exactly — JSON *is* a plain object. Lumina's `.ts` presets keep working unchanged.
- **No build step.** A JSON preset is publishable and `presets.json`-valid the moment it is
  written — it neutralises the day-one-build concern ({% ref "SPEC-116" /%}) for preset packs:
  there is nothing to compile, and `module` paths point at the `.json` files directly rather than
  at built output.
- **Schema-driven authoring + editor surface.** The universal token contract ({% ref "SPEC-048" /%})
  is a fixed schema, so this spec requires publishing a **JSON Schema** derived from it. A JSON
  preset declaring `"$schema": "…"` then gets validation, autocomplete, and colour tooling in any
  editor for free — and a future visual preset editor becomes a thin layer over that schema rather
  than a TS-parsing exercise. (The editor itself is out of scope; the schema is its foundation.)

Tradeoffs are bounded and recovered: author-time **typing** comes back via `$schema` (better for
non-TS authors); **comments** (Lumina's presets are richly annotated) have no JSON equivalent, so
prose rationale lives in the manifest's `title`/`description` or an optional `$comment`, and is
moot once an editor is the authoring surface; **computed** presets are not a thing today, and
palette *generation* belongs in a tool that emits JSON, not in the format.

## Implications

- **No engine or token-merge change.** Preset data shape, the loader's resolution contract, merge
  order, and the scope filter are unchanged — the JSON carrier (§6) only adds an extension-keyed
  read path alongside `import()`. The additions are a pack manifest, a `scope`/`compatibility` vocabulary,
  validation, and a listing command.
- **Presets stop depending on a theme package.** A pack is resolvable on its own; Lumina's presets
  remain for back-compat but are no longer the only home.
- **Curation becomes data.** "Which presets suit this theme" moves from docstrings into
  `tunedFor`, where tooling can act on it — without hard-coupling, so a universal preset still
  works everywhere.
- **Lowest-coupling artifact.** Presets touch only universal-contract tokens, so a pack carries
  near-zero maintenance coupling to refrakt's evolution relative to themes or templates — the
  contract is the stable interface.

## Acceptance Criteria

- [ ] A preset-pack package format is defined: a package shipping one or more `ThemeTokensConfig` presets (unchanged data shape) plus a standalone `presets.json` manifest (carrying a `refrakt` compatibility range per `ADR-023`), resolvable independently of any theme package.
- [ ] Presets are **carrier-agnostic**: the loader resolves a preset entry whose `module` is a `.json` file (read + `JSON.parse`, the default for new packs) *or* a JS/TS module (`default`/`config` export, Lumina's current form), yielding the same `ThemeTokensConfig` and satisfying the existing plain-object guard. A JSON preset requires **no build step** — its `module` points at the `.json` directly, neutralising the {% ref "SPEC-116" /%} day-one-build concern for preset packs.
- [ ] A **JSON Schema** derived from the universal token contract ({% ref "SPEC-048" /%}) is published so JSON presets (`"$schema": "…"`) get editor validation/autocomplete; `--type preset-pack` ({% ref "SPEC-116" /%}) scaffolds a JSON preset by default.
- [ ] Packs are a *capability*, not a `kind`: a package may declare a `presets.json` alongside a theme contract / `template.json`, and Lumina (theme + 9 presets) is expressible as a theme that also declares a pack — no `ThemeManifest` change, no single cross-artifact `kind`. Distributable discovery scans for each capability independently.
- [ ] Each preset declares a `scope` (`syntax` | `palette`) **in the manifest entry**; validation warns when a declared `syntax` preset sets chrome tokens, reusing the existing scope-eligibility classification.
- [ ] The manifest records per-preset `id`, `title`, `scope`, `module`, and an optional advisory `tunedFor` (preset → themes); absence means universal and applying a preset outside its set is never an error.
- [ ] Preset-pack install rides {% ref "SPEC-110" /%}'s shared resolver (directory | tarball | registry); apply adds the dependency, validates `presets.json`, and optionally appends the preset to `site.theme.presets` — no copy, no site creation.
- [ ] `refrakt theme presets list` lists presets resolvable from installed packs + the active theme, filterable by `--scope` and by compatibility with the active theme.
- [ ] Pack-manifest validation checks module resolvability, scope-vs-actual-tokens agreement, and `tunedFor` well-formedness, folded into the existing validation surface.
- [ ] Lumina's existing presets remain exported and functional unchanged (back-compat), and are expressible in the new pack format without altering their data.
- [ ] Docs cover the pack format, the `scope` vocabulary and its relationship to tint scope-eligibility, the dual preset/tint role, and compatibility semantics.

## Deferred (forward-compatible)

Both are additive — adding them later changes no existing manifest or preset:

- **Finer `palette` sub-scopes.** `syntax` | `palette` ships; a finer gradation
  (claims-code-surface-only vs. full-chrome) waits for a concrete consumer. New `scope` string
  values slot in without breaking validation (§2).
- **Theme → pack advertising.** `tunedFor` (preset → themes) is the v1 primitive; the inverse index
  (a theme recommending packs) is derivable and deferred (§3).

## References

- Preset loader (arbitrary module-id resolution): `packages/transform/src/preset-loader.ts`.
- Scope-eligibility filter + tint projection: `packages/transform/src/token-stylesheet.ts`
  (`filterScopeEligible`, `generateScopedTintStylesheet`); merge behaviour in
  `packages/transform/src/merge.ts`.
- Site-level preset/token composition: `packages/transform/src/site-tokens.ts`;
  `SiteThemeConfig.presets` in `packages/types/src/theme.ts`.
- Universal token contract: {% ref "SPEC-048" /%}.
- Syntax token contract + tint-as-preset projection: {% ref "SPEC-056" /%}; curated syntax presets:
  {% ref "SPEC-057" /%}.
- Tint cascade + shape alignment: {% ref "SPEC-052" /%}, {% ref "SPEC-053" /%}.
- Existing presets (valid pack members as-is): `packages/lumina/src/presets/*`.
- Install/listing surface this extends: `packages/cli/src/commands/theme.ts`.

{% /spec %}
