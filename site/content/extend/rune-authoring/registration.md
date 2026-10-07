---
title: Declaring Registration
description: Put a rune's entities and edges into the cross-page registry with a `registers` block instead of a pipeline hook
---

# Declaring Registration

A rune that names something other pages should find, a character, a place, a token set, puts it in the site-wide [entity registry](/extend/plugin-authoring/pipeline). The query side of the registry is already generic: [`collection`](/runes/collection), [`relationships`](/runes/relationships) and [`aggregate`](/runes/aggregate) work against any entity type. Getting an entity *into* the registry used to mean writing a plugin `register` hook. A `registers` block on the rune does it instead.

```typescript
export const character = createContentModelSchema({
  registers: {
    entity: {
      idFrom: 'name',
      data: ['role', 'status', 'aliases', 'tags', 'name'],
      aliases: { from: 'aliases', separator: ',' },
    },
  },
  attributes: { /* … */ },
  contentModel: /* … */,
  transform(resolved, attrs, config) { /* … */ },
});
```

One core participant reads every `registers` block and does the registering, in the same Phase 2 (register) and Phase 3 (aggregate) slots a plugin hook would use. It runs inside the declaring plugin's own hook set, beside any hooks the plugin still writes, so registration order and warnings are attributed exactly as before.

## The vocabulary

The block holds data only: strings, booleans, and lists or records of those. It round-trips through `JSON.parse(JSON.stringify(…))`, and `createContentModelSchema` rejects anything else, a function, an unknown key, a class instance, when the module is imported. There is no expression form and no predicate. That is deliberate (ADR-036): a domain that needs logic writes a plugin hook.

Declare exactly one of `entity` or `edge`.

### `entity`

| Field | Meaning |
|---|---|
| `type` | Registry type. Defaults to the rune name. |
| `idFrom` | The source holding the id. An instance whose id is empty registers nothing and warns. |
| `scope` | `'site'` (default): one entry per id, last registration wins. `'page'`: namespaced by the page it came from. |
| `data` | What goes in the entry's data bag, in this order. `'role'` carries source `role` as key `role`; `{ name: 'title' }` carries source `title` as key `name`. Nothing is added implicitly. Or `{ json: 'tokens' }`: the source holds a JSON object that *is* the bag. |
| `aliases` | `{ from, separator? }`: a data key holding alternative names, split on `separator` (default `,`). |

### `edge`

| Field | Meaning |
|---|---|
| `type` | Type of the edge's own registry entry. Defaults to the rune name. |
| `from`, `to` | The sources holding the two endpoints, by id or alias. |
| `kind` | The relationship-graph edge kind: a literal, or `{ field }` naming a key of the edge's data bag. An empty value falls back to `type`. |
| `bidirectional` | A literal, or `{ field }` naming a data key whose value is `'true'`. Default `false`. |
| `data` | Further sources for the edge entry's bag. |

An edge registers an entry of its own, with id `from→to` and a bag of `from`, `to`, the declared `data`, then `name` (`from → to`). In Phase 3 it is also contributed to the relationship graph, so `getRelated` and the `relationships` rune answer for it. Endpoints are resolved through the declaring plugin's name index, so an edge written against an alias lands on the entity's id. An endpoint that names no entity is a warning, and that edge is left out of the graph.

### Where a value comes from

A source is a bare name, resolved the way hand-written hooks have always read a rune: first a **ref**, a node inside the rune carrying `data-name=<source>` (read as its text), then the rune's **field bag** (`data-rune-fields`, filled from `properties`). `createComponentRenderable` refuses a rune whose properties and refs share a name, so a bare name cannot mean two things, and the block does not say which channel it reads.

A name that resolves to neither is almost always a typo, and it fails silently: every instance registers an empty field. So `refrakt validate` reports it as `registers-source-unresolved`, with the file and line of the rune that triggered it. The rule is the one the schema-table audit uses: a source resolves if a node carries the name, if the bag has it, or if it is one of the rune's declared attributes (an optional attribute left unset emits nothing, and that is not a typo).

## What the plugin's aggregate slot holds

A plugin that declares registrations and writes no `aggregate` hook gets the **name index** in its `aggregated` slot:

```typescript
interface RegistersIndex {
  // Every declared entity by id, then by alias. A later id replaces an
  // earlier one; an alias never replaces a name already present.
  entityByName: Map<string, EntityRegistration>;
}
```

That is what a `postProcess` hook reads: storytelling's cross-linker resolves `**Veshra**` through it, and design's sandbox injection looks up a token set by scope. A plugin that still writes its own `aggregate` keeps its slot. The declared Phase 3 work (index, edge warnings, the relationship graph) still runs.

## Seeing it

`refrakt inspect <rune>` prints the block under **Registers**, with any unresolvable source flagged, and `--json` carries it as `registers`. `refrakt reference <rune>` documents it, and the JSON reference includes it verbatim.

## Reach: what a declaration can and cannot replace

A declaration replaces registration that is a data table written as code. It does not replace registration that has logic in it. Measured against the three plugins in this repository that had registration hooks:

| Plugin | Hook code | Shape | Declarable? |
|---|---|---|---|
| storytelling | 319 lines | A generic walk, two field-list switch statements, alias expansion, one relationship case (`bond`) | **Yes.** `register` and `aggregate` are gone; `postProcess` (cross-linking prose) stays a hook. |
| design | 92 lines | The same shape, smaller: one entity whose bag is a JSON field | **Yes.** `register` and `aggregate` are gone; `postProcess` (injecting tokens into `sandbox`) stays a hook. |
| plan | 1,120 lines | A `configure` hook, module-level state, a filesystem scan outside the content tree, dependency edges parsed from prose sections, `Blocks` edges declared by a file that does not own the entity | **No**, and it stays a hook. |

The plan plugin is the counter-example that keeps this honest. Its edges come from prose, its scan reaches outside any site, and no field list expresses either. Forcing it into a declaration would either grow the vocabulary into a language or produce a declaration that lies about what runs.

Two things stay imperative everywhere:

- **Resolution.** A `registers` block says what *enters* the registry. Rewriting content from it, cross-linking prose or injecting tokens into another rune, is a `postProcess` hook.
- **Anything that needs logic to decide what counts.** No predicate, no computed id, no reading outside the rune's own output.
