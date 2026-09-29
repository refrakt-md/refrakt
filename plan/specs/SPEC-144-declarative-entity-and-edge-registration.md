{% spec id="SPEC-144" status="draft" tags="runes, pipeline, registry, declarative, plugins, hosted" %}

# Declarative entity and edge registration

## Summary

A rune declares that it registers a named entity, or an edge between two, instead
of a plugin writing a `register`/`aggregate` hook to do it. The consuming half —
the registry, the relationship graph, the runes that query them — already exists
and is already generic. Only declaration is imperative, and the imperative code
that does it turns out to be data tables written as switch statements.

This is the smallest independently valuable piece of the user-defined-rune
programme. It needs neither {% ref "SPEC-143" /%} nor {% ref "SPEC-145" /%}, ships
value to the plugins in this repo on its own, and removes the single largest
obstacle to a rune being definable without code.

## Background — the power is in the graph, not the transform

What makes the storytelling plugin more than a set of pretty boxes is that a
`bond` resolves between two `character`s defined on different pages, and that a
character's aliases are addressable. That is cross-page behaviour, and it is the
part of a domain plugin an author would most want and least be able to write.

The query side of it is already core and already domain-agnostic:

- `EntityRegistry` with `register`, `getAll`, `getByUrl`, `getById`, and
  `getRelated` over a relationship graph of `ResolvedEdge`s
  (`packages/types/src/pipeline.ts:40-145`, SPEC-072)
- `collection`, `relationships` and `aggregate` runes that query it generically,
  with resolvers in `packages/runes/src/{collection,relationships,aggregate}-resolve.ts`

So a user-defined rune can already be *queried*. It cannot get *into* the registry
without a plugin.

## Problem — the registration code is a data table in disguise

`plugins/storytelling/src/pipeline.ts` is 319 lines. Its `register` hook
(`:140-181`) is a loop with no domain logic in it: walk the page's tags, check
whether `data-rune` is in a set of entity types, extract a name, call
`registry.register({ type, id: name, sourceUrl, data })`.

The two helpers it calls are switch statements over the rune name whose every arm
is a field list:

```ts
function extractEntityName(tag, runeType): string {
  switch (runeType) {
    case 'character': case 'realm': case 'faction': return readRefText(tag, 'name');
    case 'lore':      case 'plot':                  return readRefText(tag, 'title');
    default: return '';
  }
}

function extractEntityData(tag, runeType) {
  switch (runeType) {
    case 'character':
      data.role = readField(tag, 'role');
      data.status = readField(tag, 'status');
      data.aliases = readField(tag, 'aliases');
      data.tags = readField(tag, 'tags');
      break;
    // …five more arms of the same shape
```

`aggregate` (`:183-220`) then builds a name→entity map and expands `character`
aliases from a comma-separated field. Also pattern, also no logic.

The one genuinely different case is `bond`, and it is different because it is a
*relationship* rather than an entity: its id is `${from}→${to}` and it reads two
ref fields rather than one name.

**Three declarations replace all of it.** Nothing in that file requires the
ability to run code; it requires the ability to say which field holds the id,
which fields to carry, and which two fields form an edge.

## Mechanism

A rune's declaration gains an optional `registers` block. It is inert data —
{% ref "ADR-036" /%}'s closed-vocabulary rule applies, so there is no expression
form and no predicate.

```yaml
# character
registers:
  entity:
    type: character          # defaults to the rune name
    idFrom: name             # a ref name or a field-bag key
    scope: site              # 'site' (default) | 'page'
    data: [role, status, aliases, tags]
    aliases: { from: aliases, separator: "," }

# bond
registers:
  edge:
    from: from               # ref or field holding the source entity's id
    to: to
    kind: bond               # a literal, or `{ field: kind }` to read one
```

Core gains one pipeline hook that runs for every rune carrying a `registers`
block, in the existing Phase 2 / Phase 3 slots described in `CLAUDE.md`. Plugins
keep their own hooks for everything else; this adds a generic participant, it does
not replace the hook mechanism.

**Where the values come from.** `idFrom` and `data` name either a `refs` entry
(read as its text content, as `readRefText` does today) or a `data-rune-fields`
bag key (as `readField` does). The two namespaces are disjoint, so a single name
resolves unambiguously — the implementation tries the ref first and falls back to
the bag, exactly as the hand-written helpers already do in aggregate. Whether
that fallback stays implicit or the declaration must say which channel is D3.

## Reach — honest, and narrower than it looks

Three plugins have pipeline hooks. They do not have the same shape, and this spec
should not pretend otherwise:

| Plugin | `pipeline.ts` | Shape | Reachable? |
|---|---|---|---|
| storytelling | 319 | Generic walk + two field-list switches + alias expansion; one relationship case | **Yes** — the motivating case |
| design | 92 | Same shape, smaller | **Yes** |
| plan | 1,120 | `configure` hook, module-level state, an unconditional filesystem scan outside the content tree, dependency edges parsed from H2 prose sections, `Blocks` edges belonging to a file that does not own the entity | **No** |

So the claim is: two of three plugins can shed their registration code, and the
third demonstrates why the hook mechanism has to stay. The plan plugin is the
counter-example that keeps this spec from overreaching — its edges come from
prose, its scan reaches outside any site, and no field-list declaration expresses
either.

## What this unlocks that is not in this repo

A user-defined rune with a `registers` block participates in the cross-page graph
with no code. That means the `collection`, `relationships` and `aggregate` runes
work against user domains on day one — which is the difference between a
user-defined rune being a styled box and being a content type.

It is also the piece that makes {% ref "SPEC-145" /%}'s composed runes worth
having: a composed rune's tree is built from primitives, so its *identity* has to
come from somewhere, and a `registers` block on the outer declaration is where
cross-page identity lives.

## Decisions

### D1 — the vocabulary is closed, per {% ref "ADR-036" /%}

`entity` and `edge`, with named fields. No expression form for `idFrom`, no
predicate for "which tags count", no computed `kind` beyond reading a named field.
A domain that needs more writes a plugin.

### D2 — it declares registration, never resolution

The declaration says what enters the registry. What comes out is the existing
query runes' business. In particular this spec does not add a way to declare a
`postProcess` sentinel resolution — that is where the remaining storytelling
pipeline code lives, and it stays imperative.

### D3 — one open question is deliberately deferred: channel explicitness

Whether `idFrom: name` must say `ref:name` / `field:name`, or whether the implicit
ref-then-bag fallback is good enough. The fallback matches today's behaviour and
reads better; explicitness catches a typo that would otherwise register an entity
with an empty id. Decide with a migration in hand, not before.

### D4 — no rune migrates until the registry output is proved identical

Same gate as SPEC-143 D7. A migrated plugin must produce a byte-identical registry
— same types, ids, scopes, `sourceUrl`s and `data` bags, in the same registration
order — because registration order decides last-write-wins on a site-scoped
collision (`packages/types/src/pipeline.ts:46-56`).

### D5 — `plan` is out of scope and stays out

Not a phasing decision. Its registration reads prose sections and scans the
filesystem; forcing it into a declaration would either expand the vocabulary until
it is a language ({% ref "ADR-036" /%}) or produce a declaration that lies about
what runs.

## Non-goals

- Replacing `PluginPipelineHooks` — this adds a generic participant beside them
- Declaring `postProcess` sentinel resolution
- Declaring the `configure` hook, or anything that reads the filesystem
- Changing `EntityRegistry`, the relationship graph, or any query rune
- Making the plan plugin declarative (D5)
- Cross-page *validation* of declared entities — a dangling edge target is the
  registry's existing concern, unchanged here

## Acceptance Criteria

- [ ] A rune can declare `registers.entity` with `type`, `idFrom`, `scope`, `data` and `aliases`
- [ ] A rune can declare `registers.edge` with `from`, `to` and `kind`
- [ ] The declaration contains no function values and round-trips through `JSON.parse(JSON.stringify(…))`
- [ ] One core hook performs the registration for every rune carrying the block, in the existing Phase 2 / Phase 3 slots
- [ ] `storytelling`'s `register` and `aggregate` hooks are deleted, not merely unused, and its `postProcess` is untouched
- [ ] `design`'s `register` and `aggregate` hooks are deleted the same way
- [ ] The registry produced for the site fixtures is identical before and after each migration — types, ids, scopes, `sourceUrl`s, `data` bags, and registration order (D4)
- [ ] `bond` edges resolve through `getRelated` identically to today
- [ ] `character` alias lookup resolves identically, including the "first registration wins" behaviour for a duplicate alias
- [ ] A declaration naming a field that no emitted node, field-bag entry or attribute provides is reported at validate time, with file and line — the same treatment a schema-table source already gets
- [ ] `refrakt inspect` shows a rune's registration declaration
- [ ] The generated reference documents `registers` for every rune that carries one
- [ ] The plan plugin's pipeline is unchanged, and the spec's reach table is reflected in the authoring guide

## References

- {% ref "SPEC-072" /%} — the relationship graph and the query runes this declares into
- {% ref "SPEC-143" /%} — declarative slot labelling; the same closure-over-data approach applied to the transform
- {% ref "SPEC-145" /%} — composed runes; needs this for a composed rune's cross-page identity
- {% ref "ADR-036" /%} — why the vocabulary is closed rather than an expression language
- {% ref "SPEC-064" /%} — plan content registered from outside a site's content tree; part of why `plan` is out of scope
- {% ref "SPEC-147" /%} — the storytelling replacement; the consumer that motivated this spec, and which finds D2's `postProcess` exclusion loses a capability
- {% ref "SPEC-152" /%} — the plan audit; why D5's exclusion leaves the plugin's runes composable anyway

{% /spec %}
