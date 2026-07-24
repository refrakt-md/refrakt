{% spec id="SPEC-065" status="shipped" tags="runes, xref, pipeline, config, core" released-in="v0.15.0" %}

# Configurable xref resolution

Extend the xref postProcess resolver with a configurable URL-template layer so refs to entities outside the local `EntityRegistry` can resolve to real links via project config. Backwards-compatible with the existing registry-based resolution; entirely declarative and third-party-neutral. Refrakt itself stays out of the business of knowing about specific external systems — users supply their own patterns.

The motivating case is plan content hosted externally (refrakt trace, self-hosted plan publishers, hypothetical competitors), but the same mechanism cleanly handles GitHub issues, Linear tickets, RFCs, npm packages, Wikipedia entries, DOI citations, and anything else with a deterministic URL scheme. The expand rune from {% ref "SPEC-066" /%} also consumes this chain for its canonical-link affordance — entities embedded inline get a "View canonical" link resolved by the same patterns that drive `{% ref %}`.

## Problem

The xref postProcess resolver (`packages/runes/src/xref-resolve.ts`) only consults the local `EntityRegistry`. That's the right primary source — entities authored in the project, registered by core (`page`, `heading`) or plugins (`spec`, `character`, `organization`, etc.) — but it has a hard ceiling.

Cases that fall outside today:

- **External plan hosts.** A user publishes their plan content via refrakt trace at `trace.refrakt.md/{user}/{repo}/specs/SPEC-023` (or via a self-hosted CLI, or via a competing tool). Their site's docs reference `SPEC-023`; the local registry has no entry; the ref renders as unresolved.
- **Issue trackers**. `GH-123` should link to a GitHub issue; today it can't.
- **Standards / RFCs**. `RFC-7231` should link to the IETF datatracker; today it can't.
- **Package registries**. `npm:lodash`, `pypi:requests`, etc.
- **Cross-site monorepos**. A site refs an entity in a sibling site's content; today the registry is per-site.
- **Custom domain knowledge** (chemical compounds, legal citations, academic DOIs, anything with stable URLs).

The pattern in all of these: a stable ID shape maps deterministically to a URL. Adding a configurable resolver layer turns xref from "links to local entities" into "links to anything with a URL pattern."

Critical constraint discovered in the design conversation: **refrakt must stay third-party-neutral.** Even though refrakt-md ships its own external products (refrakt trace), refrakt the framework should not bake in knowledge of any specific external system. Users author their own patterns; refrakt's docs can show recipes; the engine itself stays generic.

-----

## Design Principles

**Third-party neutral.** No hardcoded knowledge of trace, GitHub, Linear, or any other system in refrakt itself. Recipes can ship in docs, but the engine resolves whatever the user configures.

**Declarative, not programmatic.** Pattern + URL template, no code required. Users edit JSON; the resolver does the rest.

**Backward compatible.** Existing `{% ref "SPEC-023" /%}` continues to resolve via the registry when SPEC-023 is registered. Patterns are a fallback for unregistered IDs. No migration required.

**Pattern style over namespace style.** Refs stay unnamespaced (`SPEC-023`, not `plan:SPEC-023`). The resolver figures out which pattern applies. Trades one syntactic decision per ref for pattern-ordering discipline at config time.

**Registry-first resolution.** Local content beats external. If `SPEC-023` is in the registry (the user publishes plan content locally), the registry URL wins. If it's not, the pattern resolves. This biases toward "use the canonical local form when available" and lets external resolution be a graceful fallback.

**One config surface.** Top-level `xrefs` key in `refrakt.config.json`. Not per-plugin, not per-site (in v1) — because external-system patterns aren't owned by any plugin and apply project-wide.

-----

## Authoring Surface

### Configuration

`refrakt.config.json`:

```json
{
  "sites": { ... },
  "plugins": [ ... ],
  "xrefs": [
    {
      "match": "^SPEC-\\d+$",
      "template": "https://trace.refrakt.md/myuser/myrepo/specs/{id}",
      "type": "spec",
      "label": "{id}"
    },
    {
      "match": "^GH-(?<num>\\d+)$",
      "template": "https://github.com/myuser/myrepo/issues/{num}",
      "type": "github-issue",
      "label": "GitHub #{num}"
    },
    {
      "match": "^RFC-(?<num>\\d+)$",
      "template": "https://datatracker.ietf.org/doc/html/rfc{num}",
      "type": "rfc",
      "label": "RFC {num}"
    },
    {
      "match": "^npm:(?<pkg>[a-z0-9-/@.]+)$",
      "template": "https://www.npmjs.com/package/{pkg}",
      "type": "npm",
      "label": "{pkg}"
    }
  ]
}
```

### Pattern entry shape

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `match` | string | yes | Regex pattern. Compiled at config load. Anchored implicitly to whole-string match (`^` and `$` auto-applied if absent). |
| `template` | string | yes | URL template. Supports `{id}` (full matched ID) and `{name}` references to named groups in the regex. Values are encoded per URL segment before insertion — see Pattern resolution mechanics below. |
| `type` | string | no | CSS modifier class assigned as `rf-xref--{type}`. Defaults to `"external"`. |
| `label` | string | no | Template for the rendered link text. Same placeholder syntax as `template`. Defaults to `"{id}"`. |

### Usage

No syntax change to xref/ref usage. Authors write `{% ref "SPEC-023" /%}` exactly as before; resolution behavior is what changes.

```markdoc
- Implementing per {% ref "SPEC-058" /%}                  {# local registry, if published #}
- Externally hosted: {% ref "SPEC-023" /%}                {# pattern resolves to trace #}
- Tracking in {% ref "GH-123" /%}                          {# GitHub issue #}
- Conforming to {% ref "RFC-7231" /%} section 4           {# RFC standard #}
- Built on {% ref "npm:lodash" /%}                         {# npm package #}
```

The `label=` attribute on the rune itself still overrides any computed label:

```markdoc
{% ref "GH-123" label="see the original report" /%}
```

-----

## Resolution

### Resolution chain

Entity lookup and URL resolution are separable. For each xref placeholder found in postProcess:

1. **Entity lookup** — `registry.getById(typeHint?, id)` (exact-ID, optionally type-filtered), then case-insensitive name/title match. If found, capture the entity's metadata (label, type, kind) for use in rendering.
2. **URL resolution** — if the matched entity has a `sourceUrl` that is present and non-empty, use it directly (`data-xref-source="registry"`). Otherwise, iterate `xrefs` patterns in array order; the first regex that matches the ID provides the URL (`data-xref-source="pattern"`).
3. **Unresolved fallback** — if neither the entity's `sourceUrl` nor any pattern produces a URL, render `rf-xref--unresolved` span with build warning.

The split lets entity-lookup and URL-resolution succeed independently. The common case where this matters: SPEC-064's unconditional plan-content registration produces entities with `sourceUrl: undefined` (plan content that isn't published to the local site). Entity metadata (title, type) comes from the registry; URL comes from a configured pattern (e.g., trace, an external plan host). The rendered anchor gets the right label *and* a working href.

It also closes the empty-`sourceUrl` footgun: a registry-found entity without a usable URL never produces `<a href="">` — the resolver falls through to patterns instead, and worst case to the unresolved fallback.

**Normalization at registration time:** when an entity is registered with `sourceUrl: ""` (empty string), the registry normalizes to `sourceUrl: undefined`. Distinguishing explicit-empty from accidental-empty isn't useful; both behave the same.

### Pattern resolution mechanics

When a pattern matches:

1. Extract match groups from the regex result. `{id}` is the full matched string; named groups (`(?<name>...)`) are available as `{name}` in templates.
2. Encode each substituted value **per URL segment**: split the value on `/`, apply `encodeURIComponent` to each segment, rejoin with `/`. Single-segment values are unaffected (the split is a no-op); multi-segment paths preserve their structure with each segment correctly encoded.
3. Render the resolved anchor:

```html
<a class="rf-xref rf-xref--{type}"
   href="{computed-url}"
   data-xref-id="{matched-id}"
   data-xref-source="pattern">
  {computed-label}
</a>
```

The per-segment encoding handles the common case where a pattern captures a path-shaped value:

```json
{
  "match": "^docs:(?<path>[a-z0-9/-]+)$",
  "template": "https://example.com/docs/{path}"
}
```

A ref to `docs:guide/intro` resolves to `https://example.com/docs/guide/intro` (slashes preserved, each segment encoded), not `https://example.com/docs/guide%2Fintro` (which most servers route to a different path entirely).

If an author ever needs to encode a literal `/` within a single segment (a vanishingly rare case), that's a future open question — RFC 6570-style placeholder variants (`{+name}` for reserved expansion, etc.) could be added if real demand surfaces.

The `data-xref-source` attribute reflects URL provenance: `"registry"` when the URL came from the entity's `sourceUrl`, `"pattern"` when it came from a pattern. Entity metadata may have come from the registry in either case.

### Self-reference detection

If the resolved `href` equals the current page URL (after normalization), emit the same info-level "references itself" message as the registry path. Applies to pattern-resolved refs too.

### Match anchoring

Patterns are anchored to whole-string match by default — the resolver effectively wraps `match` in `^(?:...)$` if `^` and `$` aren't present at the start/end. This catches the common case where a pattern like `SPEC-\d+` shouldn't match `MY-SPEC-001`.

Authors who want partial-match semantics can write explicit anchors elsewhere or use lookahead/lookbehind.

-----

## Validation

At config load time:

- **Each `match` value is compiled.** Invalid regex → build error naming the entry index (`xrefs[2]`) and the regex parser's message.
- **Templates are parsed for placeholders.** Any `{name}` that isn't `{id}` and isn't a named group of the corresponding regex → build error. Templates can omit placeholders entirely (constant URL is valid; produces the same link for every match).
- **Duplicate `match` strings across entries** → build warning. Doesn't fail (the first-wins ordering still produces deterministic behavior) but flags redundancy.
- **Empty `xrefs` array or missing key** → no behavior change vs. baseline.
- **Reserved type values** — `unresolved` is reserved for the failure state; using it in a pattern entry's `type` is a build error.

-----

## Engine Changes

### Config types

`packages/types/src/config.ts` (or wherever the refrakt config interface lives):

```ts
export interface XrefPattern {
  match: string;
  template: string;
  type?: string;
  label?: string;
}

export interface RefraktConfig {
  // ... existing fields
  xrefs?: XrefPattern[];
}
```

### Compiled-pattern shape

```ts
interface CompiledXrefPattern {
  match: RegExp;
  template: string;
  type: string;       // resolved default if omitted
  label: string;      // resolved default if omitted
  groupNames: string[];
}
```

Compiled once at config load (`packages/content/src/site.ts` or equivalent), passed through the pipeline as part of `processContentTreeOptions`.

### Resolver extension

`packages/runes/src/xref-resolve.ts` gains a `patterns: CompiledXrefPattern[]` parameter:

```ts
export function resolveXrefs(
  renderable: unknown,
  pageUrl: string,
  registry: Readonly<EntityRegistry>,
  patterns: CompiledXrefPattern[],
  ctx: PipelineContext,
): unknown
```

After the entity-lookup attempts (and before the unresolved fallback), if the matched entity has no usable `sourceUrl` (or no entity was found), iterate `patterns` and try each `match`. First hit wins.

### Plumbing

- `processContentTreeOptions` gains `xrefPatterns?: CompiledXrefPattern[]`
- Compilation happens once per site build
- Core postProcess hook passes patterns through to `resolveXrefs`

### CSS scaffolding

`packages/lumina/styles/runes/xref.css`:

- Add `.rf-xref--external` as a generic external-link treatment (default `type` for pattern-resolved refs)
- Existing per-entity-type modifiers (`.rf-xref--spec`, `.rf-xref--character`, etc.) unchanged
- Authors can target arbitrary custom types in their own theme CSS (`.rf-xref--github-issue { … }`)

-----

## Acceptance Criteria

- [ ] `refrakt.config.json` accepts a top-level `xrefs: XrefPattern[]` array
- [ ] Pattern entries validate at config load: `match`, `template`, optional `type`, optional `label`
- [ ] Invalid regex in `match` fails config load with entry index and regex error message
- [ ] Templates referencing a non-existent named group fail config load with the entry index and the unknown placeholder name
- [ ] Templates referencing `{id}` always validate (no named group required)
- [ ] Duplicate `match` patterns emit a build warning (don't fail)
- [ ] Reserved type value `unresolved` fails config load
- [ ] `match` patterns are anchored to whole-string by default (`^(?:...)$` auto-applied unless explicit anchors present)
- [ ] Resolution chain: entity lookup (registry exact-ID → registry name) captures entity metadata; URL resolution uses entity `sourceUrl` if present and non-empty, else falls through to patterns (first match), else unresolved
- [ ] Registry entities with `sourceUrl: undefined` or `sourceUrl: ""` never produce `<a href="">`; the resolver always falls through to patterns or to the unresolved state
- [ ] At registration time, `sourceUrl: ""` is normalized to `sourceUrl: undefined`
- [ ] Patterns evaluated in array order; first match wins for any ID
- [ ] Named groups in regex are accessible as `{name}` in templates
- [ ] All placeholder values are encoded per URL segment: split on `/`, encode each segment via `encodeURIComponent`, rejoin with `/` (so path-shaped captures preserve their slashes)
- [ ] Single-segment captures are encoded the same as full `encodeURIComponent` would produce
- [ ] `type` field assigns `rf-xref--{type}` CSS modifier (default `external`)
- [ ] `label` field templates the link text (default `{id}`)
- [ ] `label=` attribute on the rune still overrides any computed label
- [ ] Rendered anchor includes `data-xref-id="{matched-id}"` and `data-xref-source="registry"` (URL from entity) or `data-xref-source="pattern"` (URL from pattern)
- [ ] Self-reference warning fires when resolved href equals current page URL
- [ ] Existing refs unaffected when no `xrefs` config present (no regression)
- [ ] Unresolved xrefs (no registry hit, no pattern match) still render as `rf-xref--unresolved`
- [ ] Patterns compile once per build; compiled forms cached across page resolutions
- [ ] Lumina ships baseline `.rf-xref--external` styling
- [ ] Authoring docs cover config syntax, regex anchoring, placeholder semantics, URL encoding behavior, and recipe examples (trace, GitHub, RFC, npm at minimum)

-----

## Out of Scope

- **Curated preset library** (`presets: ["github", "trace", "rfc"]` as shortcuts to pre-baked patterns). Powerful and friendly but couples refrakt to specific third parties — exactly what this spec is trying to avoid. Recipes in docs cover the discoverability concern. Reconsider in a future spec if the docs-recipes approach proves insufficient.
- **Per-pattern precedence flag** (`precedeRegistry: true` to override registry on a per-pattern basis). Useful for cases where the canonical URL must always be the external one regardless of local publishing, but adds learning surface for v1. Patterns-as-fallback is the simpler model; revisit if real demand surfaces.
- **Namespace-style refs** (`{% ref "gh:123" /%}`). Pattern style was chosen for backward compat and authoring ergonomics. Namespace-style would require migration of existing refs and adds a second syntax.
- **Git-remote auto-detection** for inferring `{user}/{repo}` in trace or GitHub templates. Explicit user config only — keeps build determinism and avoids "works locally, fails in CI" surprises.
- **`target="_blank"` / `rel="noopener"` automation** for external URLs. Theme concern — themes can target `.rf-xref--external` (or any non-local type modifier) and add link target attributes in their CSS-via-JS layer or document the recommendation for authors.
- **Conditional resolution by environment / site / build context** (dev vs prod, multi-site disambiguation). Single config, single resolution behavior. Users needing env-specific behavior manage that in their config build pipeline.
- **Pattern composition or inheritance** (one entry extending another). Each entry stands alone. Duplicating template strings across similar patterns is acceptable cost for declarative clarity.
- **Template helper functions** (`{name|lowercase}`, `{name|slugify}`). Adds expression-language surface; named-group captures usually cover the same need. Defer until concrete demand surfaces.
- **Resolution from within frontmatter or other non-body contexts**. xref is a body-content rune; the resolver runs in the postProcess phase of the content pipeline only.
- **Inline ref customization beyond `label=`** (custom CSS class, custom data attributes per ref). Use raw markdown links if you need arbitrary anchor markup.

-----

## Open Questions

**Should pattern entries support a `description` field for self-documenting config?** Tempting (config files get long when many integrations are configured), but YAGNI for v1 — JSONC comments handle this. Revisit when we know whether configs grow to dozens of patterns.

**Should named-group extraction validate that template references all captured groups?** I.e., warn if a regex captures `(?<num>\d+)` but the template never uses `{num}`. Recommend no — silent unused captures are fine; over-strict validation adds friction without saving real bugs.

**How does the rune's `type=` hint interact with pattern resolution?** Today `type=` filters registry lookups. Should it also constrain pattern matching (e.g., only try patterns whose `type` field matches)? Recommend no — patterns are matched by regex on the ID, and the pattern's `type` is an output (CSS class) not a filter. If two patterns could match the same ID and the author wants the spec-typed one over the work-typed one, ordering handles it.

**What about pattern matching against full URLs** (e.g., `{% ref "https://github.com/x/y/issues/5" /%}` resolving to GitHub-style rendering)? Recommend no — that's already a regular markdown link in disguise. Refs are for *IDs*, not URLs.

**Should pattern-resolved refs have a `target="_blank"` baked into rendered HTML?** Strongly leaning toward no — target attributes are accessibility and UX choices that belong in themes, not the resolver. Themes can target `.rf-xref--external` or non-local types via JS / CSS-managed link behavior.

**Caching and incremental build correctness.** Patterns compile once per config load; recompilation only happens on full reload. For dev-mode HMR, if `refrakt.config.json` changes, the dev server triggers a full reload anyway — so no special invalidation logic needed in v1. Worth confirming in the implementation pass.

**Performance**: O(patterns × xref-occurrences × pages). For typical sites (single-digit pattern count, dozens of xrefs per page, hundreds of pages), this is negligible. If anyone hits a real performance ceiling later, profile then optimize — likely with a fast-path prefix check before regex execution.

-----

## References

- {% ref "SPEC-066" /%} — expand rune (consumes this chain for canonical-link affordance)
- {% ref "SPEC-064" /%} — plan plugin unconditional registration (motivating use case for non-locally-published plan content)
- `packages/runes/src/tags/xref.ts` — current xref rune implementation
- `packages/runes/src/xref-resolve.ts` — current postProcess resolver this spec extends
- `packages/types/src/registry.ts` — `EntityRegistry` interface (existing first-pass resolution source)

{% /spec %}
