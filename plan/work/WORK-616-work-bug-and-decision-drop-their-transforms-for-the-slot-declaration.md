{% work id="WORK-616" status="done" priority="medium" complexity="moderate" source="SPEC-143" milestone="v0.39.0" tags="plan,runes,transform,declarative" pr="refrakt-md/refrakt#668" %}

# `work`, `bug` and `decision` drop their transforms for the slot declaration

The first proving set for {% ref "SPEC-143" /%}: the plan entity runes whose sections
arrive as **resolved entries** (no `emitTag`). After {% ref "SPEC-081" /%} they build no
structure; what is left is properties, `title` → `header`, `description` → `blurb`
(omitted when empty), `sections` → `body`. That is exactly what the slot declaration
expresses.

## The gate (SPEC-143 D7)

Per rune, `refrakt contracts --check` and `npm run seo:baseline:check` report **no
diff**. If a declarative form does not reproduce the transform's output byte for
byte, the gap is in the mechanism ({% ref "WORK-614" /%}), and the mechanism is what
changes, never the output.

Record the total `transform()` line count across the tag files before this item
starts. {% ref "WORK-617" /%} records the after figure.

## Acceptance Criteria

- [x] The total `transform()` line count across the tag files is recorded before the migration, in this item's resolution
- [x] `work`, `bug` and `decision` have no `transform`, and `refrakt contracts --check` plus `npm run seo:baseline:check` report no drift for any of them
- [x] `buildSections` is deleted, not merely unused
- [x] The cross-page pipeline's registry, `extractTitle` and breadcrumb reads produce identical results for plan content
- [x] Each migrated declaration round-trips through `JSON.parse(JSON.stringify(…))` unchanged

## Blocked by

- {% ref "WORK-614" /%}

## References

- {% ref "SPEC-143" /%} — "The complex end — `work`", D4, D7

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-slot-labelling`
PR: refrakt-md/refrakt#668

### What was done
- `plugins/plan/src/tags/{work,bug,decision}.ts`: transforms replaced by `workEmits` / `bugEmits` / `decisionEmits` declarations. `*Sections` is now `slotSections(*Emits)`, so the roles are stated once.
- `plugins/plan/src/util.ts`: `buildSections` and its only helper `slugify` deleted. `stripHorizontalRules` stays, because `spec` still uses it.
- `plugins/plan/test/emits-equivalence.test.ts`: the pinned-output snapshot plus per-rune JSON round-trip, `schemaEmits` and derived-`sections` tests.

### Line count
`transform()` method bodies across every rune tag file (`packages/runes/src/tags`, `plugins/*/src/tags`), counted from the `transform(` line to its closing brace:
- **before: 129 transforms, 6,385 lines**
- **after: 126 transforms, 6,282 lines (−103)**

### Gate (D7)
- `seo:baseline:check` and both contract checks show no diff.
- Because those gates cannot see these runes (no structured data; the contract is config-derived), commit 8fad478 snapshots the hand-written transforms' output for 84 inputs. That snapshot is unchanged after the migration.
- **Real corpus:** every file in `plan/work` (618), `plan/bugs` (31) and `plan/decisions` (40) was run through the schema transform and the plan plugin's `register` → `aggregate` → `postProcess`, with old src and new src against the same corpus. The sha256 of trees, registry entries, edges and post-processed pages are identical for all three.
- `extractTitle` derives from the AST, before any transform, and breadcrumbs from those titles and trees, so they are identical too.

{% /work %}
