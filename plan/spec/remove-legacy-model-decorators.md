{% spec id="SPEC-032" status="draft" tags="runes, content-model, architecture" %}

# Remove Legacy Model Class and Decorators

> Migrate all runes from the imperative Model + decorator pattern to `createContentModelSchema`, then remove the legacy API surface entirely.

---

## Problem

The rune authoring API currently exposes two parallel patterns for defining rune schemas:

1. **Legacy** — Extend the `Model` base class, use `@attribute`, `@group`, `@groupList`, and `@id` decorators, override `processChildren()` and `transform()`, wrap with `createSchema(ModelClass)`.
2. **Modern** — Call `createContentModelSchema()` with a declarative content model (`sequence`, `sections`, `delimited`, `custom`) and a `transform` function that receives resolved fields.

Both are publicly exported, both are documented, and both appear in shipped runes. This creates real problems:

- **Confusing onboarding.** Community authors must learn two patterns and decide which to use. The authoring docs cover both, doubling the surface area.
- **Decorator complexity.** The legacy pattern requires TypeScript decorators, class inheritance, and understanding the Model lifecycle (`constructor → processChildren → transform`). This is a high bar for a content framework.
- **Maintenance burden.** Bug fixes and new capabilities (deprecation transforms, conditional content models, edit hints) must be implemented in both `createSchema` and `createContentModelSchema`, or they drift apart.
- **Dead weight.** The Model class, four decorator modules, `NodeStream`, `RenderableNodeCursor`, and `createSchema` are all kept alive for ~24 runes when the modern API can express the same logic.

---

## Goal

Migrate every rune that uses `Model` + decorators to `createContentModelSchema`, then delete:

- `Model` base class (`packages/runes/src/lib/model.ts`)
- `@attribute` decorator (`packages/runes/src/lib/annotations/attribute.ts`)
- `@group` / `@groupList` decorators (`packages/runes/src/lib/annotations/group.ts`)
- `@id` decorator (`packages/runes/src/lib/annotations/id.ts`)
- `createSchema` factory (in `packages/runes/src/lib/index.ts`)
- Related types: `NodeStream`, `RenderableNodeCursor`, decorator metadata types
- Authoring docs for the Model API (`site/content/docs/authoring/model-api.md`)

After this work, `createContentModelSchema` is the sole way to define a rune schema.

---

## Scope

### In scope

- Migrate all ~24 runes that still use the legacy pattern (listed below)
- Remove the Model class, all decorators, `createSchema`, and supporting types from `@refrakt-md/runes`
- Remove or rewrite authoring docs that reference the legacy pattern
- Update the patterns doc to reflect the single API
- Ensure all existing tests pass after each migration

### Out of scope

- Changing the identity transform engine or `RuneConfig` system
- Adding new content model types to `createContentModelSchema`
- Migrating runes that already use `createContentModelSchema`
- Changing the Svelte component layer

---

## Runes to Migrate

### Core (`packages/runes/src/tags/`)

| Rune | Current pattern | Content model type | Complexity |
|------|----------------|-------------------|------------|
| accordion | Model + @group | sections | simple |
| budget | Model + @group | sequence | simple |
| conversation | Model + custom processChildren | custom | complex |
| form | Model + custom processChildren | custom | complex |
| nav | Model + @group | sections | moderate |
| reveal | Model + @group | delimited | simple |
| sandbox | Model + @group | sequence | simple |
| tabs | Model + custom processChildren | custom | complex |

### Community — marketing (`runes/marketing/src/tags/`)

| Rune | Current pattern | Content model type | Complexity |
|------|----------------|-------------------|------------|
| bento | Model + @group + custom processChildren | custom | complex |
| comparison | Model + custom processChildren | custom | complex |
| feature | Model + @group | sequence | simple |
| pricing | Model + @group | sections | moderate |
| steps | Model + @group | sequence | simple |

### Community — storytelling (`runes/storytelling/src/tags/`)

| Rune | Current pattern | Content model type | Complexity |
|------|----------------|-------------------|------------|
| character | Model + @group | sections | simple |
| faction | Model + @group | sections | simple |
| plot | Model + @group | sections | simple |
| realm | Model + @group | sections | simple |
| storyboard | Model + custom processChildren | custom | moderate |

### Community — other packages

| Rune | Package | Content model type | Complexity |
|------|---------|-------------------|------------|
| cast | business | sections | simple |
| timeline | business | sections | simple |
| changelog | docs | sections | simple |
| preview | design | sequence | simple |
| map | places | sections | moderate |

---

## Migration Strategy

### Pattern mapping

Each legacy pattern maps cleanly to a content model type:

| Legacy pattern | Content model type |
|---|---|
| `@group` with sequential node type filters | `sequence` |
| `@group` with `section` option (heading-based splitting) | `sections` |
| `@groupList` with `delimiter: 'hr'` | `delimited` |
| Custom `processChildren()` override | `custom` with `processChildren` function |
| `@attribute` declarations | `attributes` object in schema config |
| `@id` with `generate: true` | `attributes` with `id` + generate logic in `transform` |

### Migration per rune

For each rune:

1. Read the existing Model subclass to understand its attributes, groups, and transform logic
2. Write the equivalent `createContentModelSchema` call with the appropriate content model type
3. Move transform logic from the `transform()` method to the new `transform(resolved, attrs, config)` function
4. Verify with `refrakt inspect <rune> --type=all` that the identity transform output is identical
5. Run existing tests to confirm no regressions

### Ordering

Migrate in dependency order and increasing complexity:

1. **Simple runes first** (~14 runes) — straightforward `@group` → `sequence`/`sections`/`delimited` conversions. These build confidence and flush out any gaps in the migration pattern.
2. **Moderate runes** (~4 runes) — runes with multiple groups or context-dependent logic.
3. **Complex runes** (~6 runes) — runes with custom `processChildren` overrides that need `custom` content models: form, conversation, tabs, bento, comparison, storyboard.
4. **Delete legacy code** — once all runes are migrated and tests pass, remove Model, decorators, `createSchema`, and related types.
5. **Update docs** — rewrite or remove `model-api.md`, update `patterns.md` and the authoring overview.

---

## Verification

- All existing tests must pass after each rune migration (no batch migrations without intermediate verification)
- `refrakt inspect <rune> --type=all` output must be identical before and after migration for every rune
- CSS coverage tests must continue to pass (identity transform output unchanged)
- The site must build and render correctly after the full migration
- After legacy removal, confirm that `Model`, `@attribute`, `@group`, `@groupList`, `@id`, `createSchema`, `NodeStream`, and `RenderableNodeCursor` are no longer exported from `@refrakt-md/runes`

---

## Risks

**Subtle output differences.** The Model's `processChildren` and `createContentModelSchema`'s content resolver may handle edge cases differently (empty children, unexpected node types, whitespace nodes). Mitigated by per-rune `refrakt inspect` comparison.

**`@id` auto-generation.** The `@id` decorator tracks generated IDs in `config.variables.generatedIds`. The new pattern needs equivalent behavior. Check whether `createContentModelSchema` already handles this or if it needs to be added.

**`_tintNode` / `_bgNode` extraction.** The Model constructor extracts tint/bg child tags before group processing. `createContentModelSchema` already handles this (it injects tint/bg meta tags), but verify the behavior is identical.

**Community package breakage.** Any third-party packages extending Model (unlikely but possible) would break. This is acceptable since the framework is pre-1.0 and Model was never recommended for external use in the content model era.

{% /spec %}
