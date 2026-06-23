{% decision id="ADR-023" status="accepted" date="2026-06-18" source="SPEC-110" tags="versioning,compatibility,distribution,packaging,peerdeps,contracts" %}

# Versioning and compatibility for distributed extensions

## Context

refrakt's distribution story ({% ref "SPEC-109" /%} templates, {% ref "SPEC-110" /%} install,
{% ref "SPEC-111" /%} preset packs, plus plugins and themes) lets third parties publish
extensions that depend on `@refrakt-md/*`. But every versioning mechanism in the repo today is
built for the **monorepo lockstep**, not for outside extensions:

- **Changesets *fixed mode*** (RELEASING.md): every release bumps all `@refrakt-md/*` packages +
  `create-refrakt` to one version (currently `0.24.x`). Zero skew among official packages.
- **Official packages exact-pin each other** as ordinary `dependencies` (e.g. `plugins/docs` →
  `@refrakt-md/types: "0.24.4"`), with **no `peerDependencies`** and **no `engines`**. Correct
  *inside* the lockstep.
- **Stable interfaces exist as contracts**: the universal token contract ({% ref "SPEC-048" /%}),
  the structure contracts (`refrakt contracts` → `contracts/structures.json`, `--check` in CI),
  and the rune output contract.

A **third-party** extension publishes *outside* the monorepo, so:

- **Exact-pin + ordinary deps is actively wrong for it.** If `@dev/runes` pins
  `@refrakt-md/types: "0.24.4"` (copying the official style), a site on `0.25.x` resolves **two
  copies** of `@refrakt-md/types`, breaking `instanceof`/type identity.
- **No manifest declares a compatibility range.** `template.json`, `presets.json`, and
  `ThemeManifest` carry no "works with refrakt X–Y", so a mismatch surfaces as a confusing build
  error, not a clear message.
- **Pre-1.0, every minor is breaking**, so this is the norm today, not a future worry.

## Decision

A two-part strategy — a **resolution convention** and a **declared compatibility range** —
sized by how tightly each artifact couples to refrakt.

### 1. Extensions depend on `@refrakt-md/*` via `peerDependencies` + ranges

Third-party plugins, themes, template packages, and preset packs declare the `@refrakt-md/*`
packages they build against as **`peerDependencies`** with a minor-pinned range (e.g.
`">=0.24 <0.26"`), so they resolve against the **site's** installed refrakt — never bundle a
second copy. Official in-repo packages keep their exact ordinary deps (the lockstep is correct
for them). The scaffold and authoring docs prescribe the peer-dep form for extensions.

### 2. Each distributable manifest declares a `refrakt` compatibility range

`template.json`, `presets.json`, and `ThemeManifest` gain a `refrakt` range field (engines-style,
e.g. `"refrakt": ">=0.24 <0.26"`). Install ({% ref "SPEC-110" /%}) **validates it against the
project's refrakt version** — a mismatch is a clear error/warning, not a build crash.

### 3. Coupling tiers set the expected compat tightness

Different artifacts couple to different contracts, with different blast radii:

| Artifact | Couples to | Blast radius | Range tightness |
|----------|-----------|--------------|-----------------|
| Preset | universal token contract ({% ref "SPEC-048" /%}) | tiny | widest |
| Theme | structure contracts + theme/component API | medium | medium |
| Plugin | rune-authoring API (code vs. internals) | large | tightest |
| Template | rune syntax + config shape (inherits its plugin + theme) | inherited | tightest of its deps |

### 4. Hybrid compatibility primitive: marketing range now, versioned contracts as the end-state

v1 declares compatibility against the **refrakt package (marketing) version** — cheap and
immediate. The **documented migration target** is **versioned contracts**: the token, structure,
and output contracts each gain a schema version a distributable can target (e.g. "structure
contract v2"), decoupling compatibility from the marketing version so a theme need not re-declare
on every breaking minor. The contract-version mechanism is staged into a later work item; until
it exists, the marketing range is authoritative.

### 5. 0.x policy

Until 1.0, **minor = breaking**. Distributables pin to a minor range (caret `^0.x` is *not*
sufficient); the contracts are what's promised stable *within* a minor. Post-1.0, standard semver
caret ranges apply.

## Options Considered

- **Extend exact-pins to third parties.** Rejected — double-installs `@refrakt-md/*`, breaking
  type identity/`instanceof` across the boundary.
- **Caret ranges on ordinary deps.** Rejected — `^0.x` semantics are wrong pre-1.0, and ordinary
  (non-peer) deps still bundle a private copy when versions differ; refrakt's packages are
  shared singletons, which is what `peerDependencies` is for.
- **Versioned contracts only, from day one.** Rejected as v1 — real machinery (schema-versioning
  three contracts, validation) up front. Adopted as the **end-state** instead (§4 hybrid).
- **peerDeps + marketing range (chosen).** Lowest-cost correct baseline; forward-compatible with
  the contract-version end-state.

## Consequences

- Authoring docs and the `create-refrakt` extension scaffolds ({% ref "SPEC-116" /%}) prescribe
  `peerDependencies` + minor ranges for plugins/themes/template-packs/preset-packs, so authors
  start compliant rather than having to remember the policy.
- `template.json` ({% ref "SPEC-109" /%}), `presets.json` ({% ref "SPEC-111" /%}), and
  `ThemeManifest` gain a `refrakt` range field; {% ref "SPEC-110" /%} install validates it against
  the project's refrakt version (warn or refuse) — a new post-install validation row.
- A later work item defines schema versions for the token / structure / output contracts and lets
  distributables target a contract version; the marketing range remains the fallback.
- Pre-1.0, extension authors will re-declare ranges on breaking minors and should CI-test against
  the refrakt range they advertise. This is expected, not a smell, until 1.0.
- The compat range is advisory-but-enforced at install only; it adds no runtime/licensing gate
  ({% ref "SPEC-110" /%} Non-Goals stand).

## References

- Monorepo release policy (Changesets fixed mode): `RELEASING.md`.
- Install + manifest validation surface: {% ref "SPEC-110" /%}; `packages/cli/src/commands/theme.ts`.
- Distributable manifests gaining the range: {% ref "SPEC-109" /%} (`template.json`),
  {% ref "SPEC-111" /%} (`presets.json`), `ThemeManifest` in `packages/types/src/theme.ts`.
- Stable-interface contracts (the versioned-contract end-state): universal token contract
  {% ref "SPEC-048" /%}; structure contracts `contracts/structures.json` (`refrakt contracts`).
- Framework-agnostic theme packages (live-dependency rationale): ADR-009.

{% /decision %}
