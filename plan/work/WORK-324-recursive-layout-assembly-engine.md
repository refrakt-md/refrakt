{% work id="WORK-324" status="done" priority="high" complexity="complex" source="SPEC-081" tags="engine,transform,layout,grouping,assembly" milestone="v0.18.0" %}

# Recursive `layout` assembly engine

The engine primitive for {% ref "SPEC-081" /%}. Generalize `composeContainer`
into a recursive resolver over a name-keyed `layout`, so the config can *create*
the structural skeleton (preamble / content / media wrappers) rather than only
ordering containers the transform pre-built.

```ts
type LayoutEntry =
  | string[]                                              // order children; create no wrapper
  | { tag?: string; children: string[]; attrs?: Record<string, string> };
layout?: Record<string, LayoutEntry>;
```

## Acceptance Criteria

- [x] `LayoutEntry` added; `layout` accepts wrapper-creating entries (`tag`) and
  ordering entries (bare array / no `tag`).
- [x] Recursive resolver walks from `root`: creates `tag` wrappers, resolves each
  child name in order **layout entry → block → transform slot → skip**, appends
  unlisted transform nodes (never-drop rule), and honours an explicit `hide`.
- [x] Created wrappers receive their BEM class (from the key's `data-name`) and a
  `data-section` via the existing `sections` map.
- [x] Cycle / diamond resolution: each transform node is placed once; reference
  cycles (`a → b → a`) are detected (warn-and-skip vs hard error — resolve the
  SPEC-081 open question here).
- [x] `projection.group` / `projection.relocate` are reproducible via `layout`;
  engine-blocks tests cover create / order / nest / append / hide.

## Dependencies

- None — this is the standalone engine primitive (independent of SPEC-082).

## References

- {% ref "SPEC-081" /%} — declarative structure assembly.

## Resolution

Completed: 2026-06-03

Branch: claude/rune-contract-hardening

### What was done
Generalized the block-assembly into a recursive `layout` resolver that can *create* the structural skeleton, not just order existing containers.

- **types**: new `LayoutEntry = string[] | { tag?, children, attrs? }`; `RuneConfig.layout` is now `Record<string, LayoutEntry>`. Exported `LayoutEntry`/`LayoutPrimitive`/`BlockDef`/`MetaField` from `@refrakt-md/transform`.
- **engine** (`assembleWithBlocks`): replaced `composeContainer` with a recursive `placeNames` resolver. Per name, in order: (1) a `layout` entry with a `tag` → create a wrapper `<tag data-name=key ...attrs>` and recurse, pulling flat slots from the shared pool; (2) a `layout` entry without a tag → reorder the existing container in place; (3) a projected block; (4) a transform node by `data-name`; (5) skip. Unlisted slots append at root (never-drop). Each name placed once (diamond); reference cycles warn + skip (no hang). `root` present → recursive resolve from root; `root` absent → backward-compatible per-key reorder of existing containers.
- Created wrappers flow through the existing step-6 BEM/section pass (they carry `data-name`), so they get `.rf-{block}__{key}` + `data-section`; `projection.hide` runs post-assembly (step 6b), so it still drops slots.
- **contracts**: `computeChildOrder` normalizes `root` (array or `{children}`).

### Verification
- Fully backward-compatible: every current rune (root-arrays + no-root reorder configs) renders identically — full suite green (3070; the dogfood flake = WORK-330, passes in isolation).
- 6 new engine-blocks tests: wrapper creation + BEM on wrappers, nesting, append-unlisted, diamond (placed once), projection.hide composition, cycle break.

### Notes
- No rune adopts tag-entries yet — WORK-325 migrates the runes (recipe/character/etc.) to flat-emit + declarative grouping, which is what exercises wrapper creation in production. Contracts unchanged (no rune uses the new form yet).

{% /work %}
