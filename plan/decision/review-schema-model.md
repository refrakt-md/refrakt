{% decision id="ADR-005" status="proposed" date="2026-04-02" tags="runes, types, architecture, authoring" %}

# Replace the useSchema / Type class system with plain rune identifiers

## Context

Every rune in refrakt — core and community — goes through a three-file ceremony to register its identity:

1. **Schema class** (e.g. `packages/runes/src/schema/hint.ts`):
   ```ts
   export class Hint {
     hintType: 'check' | 'note' | 'warning' | 'caution' = 'note';
   }
   ```

2. **Registry entry** (e.g. `packages/runes/src/registry.ts`):
   ```ts
   Hint: useSchema(Hint).defineType('Hint'),
   ```

3. **Usage in the tag's transform** (e.g. `packages/runes/src/tags/hint.ts`):
   ```ts
   return createComponentRenderable(schema.Hint, { tag: 'section', ... });
   ```

The `useSchema()` factory creates a `TypeFactory`, which creates a `Type` instance carrying:
- `name` — a string like `"Hint"`
- `schemaCtr` — the class constructor
- `context` — always `{}`
- `schemaOrgType` — an optional string like `"FAQPage"`
- `create()` — a method that instantiates the class

At runtime, `createComponentRenderable` reads exactly **two values** from the `Type` object:

```ts
'data-rune': toKebabCase(type.name),           // "Hint" → "hint"
typeof: result.typeof ?? type.schemaOrgType,    // e.g. "FAQPage"
```

The `create()` method is **never called** anywhere in the codebase. The `context` record is always empty. The class constructor stored in `schemaCtr` is never used after registration. The schema class fields and their default values are never read at runtime.

This system was designed early in the project anticipating that `Type` would do more — validate attributes against the class shape, instantiate typed models, enable IDE autocompletion on rune properties. That vision didn't materialize because `createContentModelSchema` + the engine config became the real workhorses. The schema classes are now vestigial.

## Problems

1. **Three files to carry two strings.** A rune name and an optional schema.org type are the only runtime-relevant data, but they require a class definition, a registry line, and an import chain.

2. **Misleading semantics.** The class syntax implies fields and types matter at runtime. New rune authors see `hintType: 'check' | 'note' | 'warning' | 'caution' = 'note'` and reasonably assume this drives validation or defaults. It doesn't — the Markdoc `attributes` definition in the tag schema and the engine config's `modifiers` are what actually matter. The schema class is a third, disconnected description of the same information.

3. **Triple redundancy for modifier fields.** A modifier like `hintType` is declared in:
   - The schema class (`schema/hint.ts`) — unused at runtime
   - The Markdoc tag attributes (`tags/hint.ts`) — drives parse-time validation
   - The engine config (`config.ts`) — drives theme-time BEM classes and data attributes

4. **Community package friction.** Every community package must replicate the pattern: a `schema/` directory with classes, a `types.ts` registry file with `useSchema` calls, and imports threading through to each tag. This is ~8-15 lines of boilerplate per rune that does nothing.

5. **`RuneDescriptor.type` on the `Rune` class.** The `Rune` class (`packages/runes/src/rune.ts`) carries an optional `type: Type` field. The only consumer is `refrakt inspect`, which reads `rune.type?.name` to display the typeof value. This could trivially be a plain string field.

## Options Considered

### 1. Replace `Type` with a plain object literal

Change `createComponentRenderable` to accept a simple descriptor instead of a `Type` instance:

```ts
// Before
createComponentRenderable(schema.Hint, { tag: 'section', ... })

// After
createComponentRenderable({ name: 'Hint', schemaOrgType: undefined }, { tag: 'section', ... })
```

**Pros:** Minimal change to the call signature. No class hierarchy. Self-documenting at the call site.
**Cons:** Still a separate object to define. Slightly more verbose at each call site.

### 2. Inline name and schemaOrgType into `TransformResult`

Fold the two strings directly into the result object that `createComponentRenderable` already accepts:

```ts
// Before
return createComponentRenderable(schema.Hint, {
  tag: 'section',
  property: 'contentSection',
  ...
});

// After
return createComponentRenderable({
  rune: 'hint',
  tag: 'section',
  schemaOrgType: 'FAQPage',  // only when needed
  property: 'contentSection',
  ...
});
```

**Pros:** Single function, single object. No separate type system at all. The rune name is visible right where it's used. `schemaOrgType` is opt-in — most runes omit it.
**Cons:** Largest migration surface. Requires updating every rune's transform function.

### 3. Keep `Type` but drop the class/factory ceremony

Keep the `Type` class but create instances directly with a simple factory:

```ts
// Before (3 files)
export class Hint { hintType: '...' = 'note'; }
Hint: useSchema(Hint).defineType('Hint'),
createComponentRenderable(schema.Hint, { ... })

// After (inline)
const HintType = defineType('Hint');
createComponentRenderable(HintType, { ... })
```

**Pros:** Least disruption to existing call sites. `Type` stays as a concept.
**Cons:** Still an unnecessary indirection for two strings. Preserves a class that exists only to carry data.

## Decision

**Option 2: Inline name and schemaOrgType into `TransformResult`.** This is the cleanest end state and eliminates the concept entirely rather than just simplifying it.

The migration is mechanical: every `createComponentRenderable(schema.X, { ... })` call becomes `createComponentRenderable({ rune: 'x', ... })`, optionally adding `schemaOrgType` for runes that have one. This can be done incrementally — support both signatures during a transition period.

## Migration Strategy

### Phase 1: Dual-signature support (non-breaking)

1. Update `createComponentRenderable` to accept either the current `Type` first argument or a unified `TransformResult` with a `rune` field:

   ```ts
   export function createComponentRenderable(
     typeOrResult: Type | UnifiedTransformResult,
     result?: TransformResult
   ): Tag
   ```

2. When `typeOrResult` has a `rune` property, use the new path. Otherwise fall back to the existing `Type`-based path.

3. Update the `RuneDescriptor` and `Rune` class: replace `type?: Type` with `typeName?: string` and `schemaOrgType?: string`.

4. Update `refrakt inspect` to read `rune.typeName` instead of `rune.type?.name`.

### Phase 2: Migrate runes (incremental, package-by-package)

1. **Core runes** (`packages/runes/src/tags/*.ts`): Update each tag's `transform` function to use the new signature. Remove the corresponding schema class import and registry entry.

2. **Community packages** (`runes/*/src/tags/*.ts`): Same migration per package. Remove each package's `schema/` directory and `types.ts` registry when all its runes are migrated.

3. Order doesn't matter — both signatures work simultaneously.

### Phase 3: Cleanup (breaking, major version)

1. Remove the old `Type` signature from `createComponentRenderable`.
2. Delete `packages/types/src/schema/index.ts` (the `Type`, `TypeFactory`, `useSchema` exports).
3. Delete all `schema/` directories and registry files across core and community packages.
4. Remove `useSchema` from the public API of `@refrakt-md/types`.
5. Update authoring docs to remove references to schema classes and `useSchema`.

### Scope estimate

- ~100 runes to update (37 core + ~65 community)
- Each update is a 2-3 line change in the transform function
- ~30 schema class files to delete
- ~10 registry files to delete
- ~1 function signature to update (`createComponentRenderable`)
- ~1 interface to update (`RuneDescriptor`)
- ~4 lines in `inspect.ts` to update

The migration is wide but shallow — no logic changes, just plumbing.

## Consequences

**Positive:**
- Rune authoring drops from 3 concepts (schema class + registry + tag) to 1 (tag with inline metadata)
- No more triple-redundancy for modifier field declarations
- Community package scaffolding becomes simpler — no `schema/` directory or `types.ts` needed
- The authoring docs can remove the "Type definition" step entirely
- `createComponentRenderable` becomes self-documenting — all inputs visible at the call site

**Negative:**
- If a future need arises for runtime type instances (validation, editor introspection based on class shapes), that capability would need to be rebuilt. However, the Markdoc `attributes` definition already serves this purpose and is the authoritative source.
- Wide migration surface means this should be coordinated, not done piecemeal across unrelated PRs.

**Neutral:**
- The `data-rune` and `typeof` HTML attributes are unchanged. No theme or CSS impact.
- The engine config, identity transform, and rendering pipeline are completely unaffected.
- Existing content (Markdown files) requires zero changes.

{% /decision %}
