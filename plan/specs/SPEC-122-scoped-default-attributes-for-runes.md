{% spec id="SPEC-122" status="draft" tags="runes,config,attributes,defaults,dx,type-safety" %}

# Scoped default attributes for runes

A site often wants every instance of a rune to share the same attribute values.
A recipe blog where each post carries one `{% recipe %}` wants the same
`media-position` on all of them; a docs section wants every `hint` to default to a
house style. Today the only DRY tool is Markdoc variables (`{% $var %}`), which is
per-page, must be threaded into each rune by hand, and gets verbose the moment more
than one attribute is involved. There is no way to say, once, "this rune defaults
these attributes — everywhere, or on these routes."

This spec adds **scoped default attributes**: a config-declared bag of attribute
values applied to a rune when the author omits them, optionally narrowed by route
pattern. The representation and the precedence/validation policy are fixed by
{% ref "ADR-027" /%}; this spec is the config surface, the injection point, and the
type-safety story.

## Problem evidence

- **Attributes resolve per page, with route already in hand.** Values are locked in
  at the schema-transform stage in `transformContent`
  (`packages/content/src/site.ts`), whose Markdoc config already carries `path` (the
  page URL) in `variables`. The information a route-scoped default needs is
  *already present* at the exact point a rune's `transform()` runs — no new plumbing
  to know "what page am I on."
- **Config already keys behaviour on glob patterns.** `routeRules` in
  `refrakt.config.json` matches `pattern` globs to assign `layout`/`entity`. A
  rune-default map keyed the same way reads as existing config vocabulary, not a
  bolt-on.
- **No defaulting mechanism exists.** Runes carry per-attribute `default` in their
  Markdoc schema, but that is a single global value baked into the rune — not
  site- or route-configurable, and not overridable per project.
- **Variables are the only workaround and they don't scale.** They express no
  rune/route scoping and repeat at every call site.

## Design

### 1. Config surface — `runeDefaults`

A new top-level (and per-site) array in `refrakt.config.json`:

```jsonc
"runeDefaults": [
  { "rune": "recipe", "attributes": { "media-position": "right" } },
  { "rune": "hero", "pattern": "blog/*", "attributes": { "align": "center" } }
]
```

- `rune` — kebab-case rune name (matches inline authoring and the `data-rune` key).
- `pattern` — optional glob, matched against the page URL with the **same matcher
  `routeRules` uses**. Omitted means site-wide.
- `attributes` — the object-valued bag ({% ref "ADR-027" /%} §1).

Entries are additive; multiple may match one rune on one page (a site-wide entry
plus a route-scoped one). More-specific (route-scoped) beats less-specific
(rune-global) per {% ref "ADR-027" /%} §2.

### 2. Injection point

Defaults are resolved and merged in the transform path
(`packages/content/src/site.ts`, around `transformContent`), where `path` is
available to evaluate `pattern`. The merge produces the effective inline-attribute
set *before* the rune's schema transform runs, so the rune sees a normal attribute
record and needs no per-rune awareness of defaults.

### 3. Precedence and the schema-default trap

Per {% ref "ADR-027" /%} §2, effective value order is **inline author →
route-scoped default → rune-global default → schema default**. The critical
mechanism: a rune's Markdoc `SchemaAttribute.default` would otherwise make
"author wrote it" and "schema filled it" indistinguishable, so config defaults
must be layered in *before* schema defaults resolve — the shared precedence-merge
helper ({% ref "ADR-027" /%}) suppresses the schema default for any attribute a bag
governs. An explicit inline attribute always wins; a default never overwrites
authored intent.

### 4. Validation at config-load

Each `attributes` bag is validated against its `rune`'s live Markdoc schema when
config loads, using the shared bag validator ({% ref "ADR-027" /%} §3): an unknown
attribute key, a bad enum value, or a wrong-typed value **errors at startup**,
naming the site, rune, pattern, and offending key — not silently per page. Because
runes are plugin-contributed, validation runs against the project's *enabled*
plugin set.

### 5. Type safety — config completion is a schema projection

There are no per-rune TypeScript interfaces for attributes; rune attributes are
runtime Markdoc `SchemaAttribute` records, and IDE intelligence comes from two
non-TS surfaces: the JSON Schema behind `refrakt.config.json`, and the
`@refrakt-md/language-server` for `.md` content (which reads the live schemas).
The config schema knows nothing about rune attributes today, so a hand-typed
`runeDefaults` bag gets zero completion.

To give `runeDefaults` editor completion (rune name → its attributes → enum
values), `refrakt` **projects the enabled plugins' rune schemas into a generated
JSON Schema fragment** for the `runeDefaults` block — the same `matches`/`type`/
`required`/`default` data the language server already formats. Because attributes
depend on the plugin set, this is generated per project (emitted to a
project-local schema file the config `$schema`/settings can point at), not baked
into the static `refrakt.config.schema.json`. Config-load validation (§4) is the
non-negotiable floor; the JSON-Schema projection is the editor affordance on top.

### 6. Provenance in `inspect`

Because a default lives in config, not on the page, a rune can render differently
with no visible cause — "spooky action at a distance." `refrakt inspect` gains an
**effective-attributes view with provenance**: for each attribute, its resolved
value and source (inline author / route default / rune-global default / schema
default). This is a required companion, not optional — without it the feature
generates support questions.

## Non-goals

- **Not per-rune TypeScript interfaces.** Type safety here is schema projection and
  config-load validation ({% ref "ADR-027" /%}), not generated TS types.
- **Not a universal inline escape hatch.** This does not add `attributes={...}` to
  every rune as a second way to set inline attributes ({% ref "ADR-027" /%} §Scope).
- **Not embed overrides.** Applying attributes to an *embedded* entity at the
  contribution site is {% ref "SPEC-123" /%}; it reuses this spec's bag and
  validator but resolves at build time, not config-load.
- **Directory-cascade defaults are deferred.** A `_layout.md`-style cascade of
  defaults down a content tree is a natural future shape (the mental model already
  exists), but v1 is the flat config map.

## Acceptance Criteria

- [ ] `refrakt.config.json` accepts a `runeDefaults` array (top-level and per-site) of `{ rune, pattern?, attributes }` entries, with `pattern` matched by the same glob matcher as `routeRules`.
- [ ] Omitted rune attributes are filled from the most-specific matching entry; effective order is inline author → route-scoped default → rune-global default → schema default, with an explicit inline attribute always winning ({% ref "ADR-027" /%} §2).
- [ ] Config defaults are layered in before Markdoc schema defaults resolve, so "author wrote it" is distinguishable from "default filled it" (schema-default suppression via the shared precedence-merge helper).
- [ ] Each `attributes` bag is validated against its rune's live schema at config-load using the shared bag validator; an unknown key, bad enum value, or mistyped value errors at startup naming site/rune/pattern/key.
- [ ] `refrakt` emits a generated JSON Schema fragment for `runeDefaults` derived from the enabled plugins' rune schemas, giving rune-name / attribute-name / enum-value completion in `refrakt.config.json`.
- [ ] `refrakt inspect` shows effective attributes with provenance (inline author / route default / rune-global default / schema default).
- [ ] Editing `runeDefaults` invalidates affected pages under dev HMR.
- [ ] Authoring/config docs cover `runeDefaults`, precedence, and the provenance view.

## References

- Injection point + route context: `transformContent` and `variables.path` in
  `packages/content/src/site.ts`.
- Route-pattern precedent: `routeRules` in `refrakt.config.json` +
  `packages/content/src/page-entities.ts`.
- Representation, precedence, and validation policy: {% ref "ADR-027" /%}.
- Language-server schema surface (source of projected completion data):
  `packages/language-server/src/providers/completion.ts`,
  `packages/language-server/src/registry/loader.ts`.
- Embed-override sibling feature reusing the bag: {% ref "SPEC-123" /%}.
- Expand rune (embedding context): {% ref "SPEC-066" /%}.

{% /spec %}
