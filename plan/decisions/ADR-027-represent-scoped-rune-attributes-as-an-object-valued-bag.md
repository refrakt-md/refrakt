{% decision id="ADR-027" status="proposed" date="2026-07-24" source="SPEC-122" tags="runes,attributes,markdoc,config,validation,architecture" %}

# Represent scoped rune attributes as an object-valued bag

## Context

Two features want to carry *a set of attribute values to apply to a rune* from
somewhere other than the rune's own inline attributes:

- **Scoped defaults** ({% ref "SPEC-122" /%}) — fill omitted attributes for every
  instance of a rune, optionally narrowed by route pattern (all `recipe`s get
  `media-position="right"`; all `hero`s under `blog/*` get `align="center"`).
- **Embed overrides** ({% ref "SPEC-123" /%}) — a page that embeds an entity via
  `{% expand %}` wants to re-skin it with attributes the source never set.

Both need the same primitive — "here is a bag of attribute key/values, apply them
to rune R" — and both raise the same three load-bearing questions. This ADR
settles the shared representation and the two policies that ride on it, so the
specs don't each answer them differently.

Three facts shape the decision:

- **Markdoc reserves the punctuation namespacing would need.** {% ref "SPEC-001" /%}
  §Namespacing records that `.` is class-shorthand / variable access and cannot
  appear in tag names; `:` is not a valid identifier character either. A
  `set:media-position="left"` style attribute name does not parse. This is why
  collision resolution already lives in config, not syntax.
- **`expand` already overloads `type`.** The expand rune uses `type` as an
  entity-type *hint* (`packages/runes/src/expand-pipeline.ts` reads
  `data-expand-type`). A flat pass-through override named `type` — common on
  embedded runes — would be ambiguous against expand's own attribute. Any flat
  scheme has to solve this collision; a bag sidesteps it.
- **Markdoc object-literal attribute values are supported and already
  dogfooded.** The `partial` rune ships `variables={name: "Sarah", plan: "Pro"}`
  (`site/content/extend/rune-authoring/partials.md`). Parsing was verified against
  the pinned `@markdoc/markdoc@0.4.0`: `attributes={media-position: "left",
  featured: true}` parses to `{ "media-position": "left", "featured": true }` —
  **bare hyphenated keys need no quoting**, and values keep their JS types
  (`true` is a boolean, not the string `"true"`).

## Options Considered

1. **Flat pass-through attributes, namespaced by prefix.** e.g.
   `{% expand set-media-position="left" %}` or a `set:` prefix. Rejected:
   `:`-namespacing does not parse in Markdoc ({% ref "SPEC-001" /%}); a bare
   `set-*` convention re-collides with any real attribute that starts `set-` and
   still forces the tag's own attribute set open, losing strict validation on
   `primary`/`type`/`level`. It also fragments across features (config can't use a
   tag-attribute prefix).
2. **Markdoc variables only.** Authors already have `{% $var %}`. Rejected as the
   sole mechanism: it is per-page and verbose ({% ref "SPEC-122" /%}'s motivating
   complaint), models no route/rune scoping, and does nothing for the embed-override
   case where the target attributes belong to *another* entity's rune. Variables
   remain available and compose *inside* a bag (`attributes={pos: $x}`), but they
   are not the carrier.
3. **A single object-valued attribute bag (chosen).** One `attributes={...}`
   object literal, reused as the config-side shape. Valid Markdoc, no name
   collisions, typed values, and one representation across both features.

## Decision

Adopt an **object-valued attribute bag** as the single representation for scoped
and injected rune attributes, carried as `attributes={...}` on a tag and as an
`attributes` object in config. Three sub-decisions ride on it.

### 1. Representation — one shape, three sites

The same `{ key: value }` bag is the unit in **all** of:

- config scoped defaults (`runeDefaults[].attributes`, {% ref "SPEC-122" /%}),
- the `{% expand attributes={...} %}` override ({% ref "SPEC-123" /%}),
- the internal precedence-merge that combines them with inline attributes.

Because the shape is identical everywhere, **one validator** — *"validate this
attribute bag against rune schema R"* — serves config-load validation
({% ref "SPEC-122" /%}) and expand's build-time validation
({% ref "SPEC-123" /%}). One tested code path, not two divergent ones. Keys are
kebab-case rune attribute names (matching inline authoring); values are typed
Markdoc literals.

**Name is `attributes`, not `variables`.** `partial` already uses `variables=` to
mean *Markdoc `$vars`* — a different concept (template substitution, not rune
attributes). Reusing that word would conflate the two. `attributes=` is
self-documenting and reads as a deliberate parallel.

### 2. Precedence — and the schema-default trap

The merge order, most-authoritative first, is:

**inline author attribute → most-specific scoped/injected bag → rune schema
default.**

An explicit inline attribute always wins; a bag never overrides what the author
wrote by hand. For {% ref "SPEC-122" /%} the bag tiers are route-scoped (more
specific) over rune-global; for {% ref "SPEC-123" /%} the single bag sits above
the embedded entity's own authored attributes.

The trap: Markdoc `SchemaAttribute` carries its own `default`, applied during
`transform`. By the time a rune's `transform()` sees `attrs`, **an author-written
value and a schema-filled default are indistinguishable** — so a bag applied
*after* schema defaults resolve cannot honour "inline author wins." Therefore bag
values must be layered in **before** schema defaults take effect: for any
attribute a bag governs, the schema default is suppressed (sentinel the omitted
value) so the bag→schema-default order is real rather than always losing to the
schema default. This is the one mechanism both specs must build on and is called
out in each.

### 3. Validation posture — LSP-quiet, build/config-strict

The bag is opaque to the language server. `getTagContext`
(`packages/language-server/src/parser/document.ts`) recognises only
`name="value"` attribute positions; it does not descend into an object literal, so
there is **no completion, hover, or diagnostic for keys or values inside
`attributes={...}`**. For {% ref "SPEC-123" /%} this is unavoidable regardless —
the target rune is only known once `id` resolves against the build-time registry,
which the editor cannot do.

We recover correctness by moving validation to where the schema *is* resolvable:

- **Config defaults** validate at **config-load** ({% ref "SPEC-122" /%}) — a bad
  key or enum value errors loudly at startup, naming the rune and attribute.
- **Expand overrides** validate at **build time** ({% ref "SPEC-123" /%}) — the
  registry is resolved, so the bag is checked against the target entity's root
  rune schema. This catches semantic typos the parser accepts: `mediaPosition:
  "left"` parses fine as an object key but is not a real attribute, and only
  schema validation flags it.

The editor stays quiet; the build does not.

### Scope

The bag is the vehicle for **scoped defaults** (config) and **embed overrides**
(`expand`). It is deliberately **not** a universal per-rune escape hatch — we do
*not* add `attributes={...}` to every rune as a second way to set inline
attributes. That would create two authoring paths for the same value and muddy
precedence and validation. `expand` earns the bag because embedding is inherently
a re-skinning operation; ordinary runes set attributes inline.

## Rationale

The object bag is the only representation that is simultaneously valid Markdoc,
collision-free, and *shared* across both features. Namespaced flat attributes fail
the Markdoc grammar and the `type` collision; variables-only fails the scoping and
cross-entity requirements. Choosing one shape collapses two features onto one
validator and one precedence routine, which is worth more than the completion the
bag gives up — completion that {% ref "SPEC-123" /%} could never have offered
anyway. The precedence and validation policies are settled here, once, because
both specs would otherwise be tempted to answer them locally and drift.

## Consequences

- **Shared machinery to build:** a bag-vs-schema validator and a precedence-merge
  helper, consumed by both {% ref "SPEC-122" /%} (config-load) and
  {% ref "SPEC-123" /%} (build-time). The schema-default suppression is part of the
  merge helper, not each caller.
- **No in-editor intelligence inside the bag.** Documentation and examples must
  carry the weight the LSP normally would; the build/config-load errors are the
  safety net. A future language-server feature *could* resolve `id` → target rune
  and complete bag keys, but it is out of scope and not assumed.
- **Type safety for config is a projection problem, not a TypeScript one.** Editor
  completion for `runeDefaults` in `refrakt.config.json` requires projecting the
  runtime rune schemas into JSON Schema (plugin-dependent, generated). That is a
  {% ref "SPEC-122" /%} concern; this ADR only fixes that the data being projected
  is a bag.
- **`attributes` becomes a reserved attribute name on `expand`.** Should a future
  rune want a literal attribute called `attributes`, it must pick another name.
- **Verified parse floor is Markdoc 0.4.0.** Bare hyphenated object keys and typed
  literal values are relied upon; a Markdoc upgrade must preserve them (a cheap
  parse test guards this).

{% /decision %}
