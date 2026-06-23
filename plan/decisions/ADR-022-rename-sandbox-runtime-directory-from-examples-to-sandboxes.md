{% decision id="ADR-022" status="accepted" date="2026-06-18" source="SPEC-104" tags="sandbox, config, naming, dx, migration" %}

# Rename the sandbox runtime directory from `examples` to `sandboxes`

## Context

A `{% sandbox %}` with a `src` attribute loads its program files (`html`/`css`/`js`/`glsl`)
from a project directory, scanned at build time by `assembleFromDirectory`
(`packages/runes/src/sandbox-sources.ts`). That directory is configurable and surfaces as a
shipped convention:

- **Config key:** `sites.<site>.sandbox.examplesDir` (`packages/types/src/theme.ts`).
- **Default when unset:** `<contentDir>/../examples` — i.e. `site/examples/`
  (`packages/content/src/site.ts`).
- **Internal plumbing:** `sandboxExamplesDir` / `__sandboxExamplesDir`, threaded through
  `content`, `sveltekit`, `eleventy`, and the `editor`.

The name dates to the **original** use case: sandboxes as documentation/showcase **examples**
on refrakt's own site. Bundled site templates ({% ref "SPEC-109" /%} §7) break that assumption.
A template can now ship a sandbox that is a **load-bearing part of the site** — a music blog's
audio visualizer ({% ref "SPEC-104" /%}), a data dashboard's chart scene. Filing a production
visualizer under `examples/` (and configuring it via `sandbox.examplesDir`) misnames it: these
are programs, not demos.

This is a sandbox-system convention, defined by {% ref "SPEC-104" /%}, that SPEC-109 only reuses.
Recording the naming decision here keeps it where the convention lives rather than buried in a
template spec. The directory being **configurable** softens the blow — nothing hard-codes
`examples/` — but the default path and the public config key still carry the legacy name.

## Options Considered

### 1. Keep `examples` everywhere

**Pros:** zero churn; no migration; existing projects untouched.
**Cons:** the name actively misleads for the now-primary case (sandboxes as site programs); the
config key `sandbox.examplesDir` reads wrong in any real project; the misnomer compounds as
templates make bundled sandboxes common. Rejected — the cost is paid forever by every author
who reads it.

### 2. Rename only the default folder, keep the `examplesDir` key

Change the default path to `site/sandboxes/` but leave the config key named `examplesDir`.

**Pros:** fixes the most-seen artifact (the folder) with no config-key migration.
**Cons:** internally inconsistent — a `sandboxes/` folder configured by an `examplesDir` key —
which is more confusing than either name used consistently. Rejected.

### 3. Rename folder **and** config key, with a deprecated alias (chosen)

Default folder becomes `sandboxes/`; the config key becomes `sites.<site>.sandbox.dir`
(`dir` is unambiguous under the `sandbox` key). `examplesDir` is retained as a **deprecated
alias** that still resolves (with a warning) so existing projects keep working; new scaffolds
and docs use the new names.

**Pros:** the name matches what the thing is (and the `{% sandbox %}` rune); folder and key are
consistent; back-compat alias means no hard break; the internal `sandboxExamplesDir` plumbing is
renamed to `sandboxDir` in the same pass.
**Cons:** touches several packages and the config schema; needs a deprecation path and a docs/
migration note. Accepted — the churn is one-time and mechanical, the clarity is permanent.

### 4. `scenes/` instead of `sandboxes/`

{% ref "SPEC-104" /%} calls a sandbox *instance* a "scene" (a `bg` backdrop scene).

**Pros:** resonates with the bg-backdrop vocabulary.
**Cons:** "scene" is bg-flavored and narrower than the general `{% sandbox %}` rune, which also
renders in flow; `programs/`/`apps/` are too generic. Rejected in favour of `sandboxes/`, which
mirrors the rune name and covers every use. Noted for the record.

## Decision

Adopt **Option 3**. The sandbox runtime directory is named **`sandboxes/`** (default
`<contentDir>/../sandboxes`), configured via **`sites.<site>.sandbox.dir`**. The legacy
`sandbox.examplesDir` key and the `site/examples/` default are kept as a **deprecated alias**
that resolves with a warning, so existing projects continue to build unchanged. Internal
identifiers (`sandboxExamplesDir`, `__sandboxExamplesDir`) are renamed to the `sandboxDir`
form. `{% ref "SPEC-109" /%}` template packages carry their program trees in a `sandboxes/`
folder and scaffold them into the project's configured sandbox directory.

## Rationale

The directory holds programs that are part of the site; `examples` describes a use case (docs
demos) that is now the minority. Naming the convention after the rune that consumes it
(`sandbox` → `sandboxes/` → `sandbox.dir`) makes the whole chain self-consistent and
teachable, and stops misfiling production code under a demo folder. Because the path is already
configurable, a deprecated alias is cheap and removes any forced migration — the rename is an
improvement projects adopt on their own schedule, not a break imposed on them.

**`dir` stays nested under `sandbox`** rather than flattening to a top-level `sandboxDir` (which
would parallel `contentDir`). `SiteConfig` nests multi-option *feature groups* (`highlight`,
`runes`, `sandbox`) and keeps single-value settings flat (`contentDir`, `theme`, `baseUrl`).
`sandbox` is a growth area — the bundled-sandbox work ({% ref "SPEC-104" /%}, {% ref "SPEC-109" /%})
anticipates further keys such as a default framework, a CDN/CSP origin allowlist, or activation
defaults — so the group is retained deliberately. The `contentDir`-vs-`sandbox.dir` asymmetry is
intentional: content needs only a path; sandboxes are a namespace.

## Consequences

- `packages/types/src/theme.ts` gains `sandbox.dir`; `sandbox.examplesDir` is marked
  `@deprecated` and still read as a fallback.
- Config resolution (`packages/content/src/site.ts`) defaults to `../sandboxes`, falling back to
  `../examples` when present, and honours `dir` over the deprecated `examplesDir`.
- `sandboxExamplesDir`/`__sandboxExamplesDir` are renamed to `sandboxDir`/`__sandboxDir` across
  `content`, `sveltekit`, `eleventy`, and `editor`; the deprecated alias is mapped at the config
  boundary so internals see one name.
- `refrakt.config.schema.json` documents `sandbox.dir` and marks `examplesDir` deprecated.
- A migration note (and ideally a `refrakt`/`plan`-style helper) covers renaming `site/examples/`
  → `site/sandboxes/` and the config key; the alias means it is opt-in.
- {% ref "SPEC-109" /%} §7 references "the project's configured sandbox directory" rather than a
  literal path, so the template spec stays correct regardless of the default name.

## References

- Live sandbox guests + the sandbox-as-content convention: {% ref "SPEC-104" /%}.
- Bundled sandboxes in site templates: {% ref "SPEC-109" /%} §7.
- Sandbox source scanning: `packages/runes/src/sandbox-sources.ts` (`assembleFromDirectory`),
  `packages/runes/src/tags/sandbox.ts` (`__sandboxExamplesDir`).
- Config surface + default path: `packages/types/src/theme.ts` (`sandbox.examplesDir`),
  `packages/content/src/site.ts` (`../examples` default), `packages/sveltekit/src/plugin.ts`,
  `packages/eleventy/src/plugin.ts`.

{% /decision %}
