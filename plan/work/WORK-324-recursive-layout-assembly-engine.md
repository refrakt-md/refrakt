{% work id="WORK-324" status="ready" priority="high" complexity="complex" source="SPEC-081" tags="engine,transform,layout,grouping,assembly" milestone="v0.18.0" %}

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

- [ ] `LayoutEntry` added; `layout` accepts wrapper-creating entries (`tag`) and
  ordering entries (bare array / no `tag`).
- [ ] Recursive resolver walks from `root`: creates `tag` wrappers, resolves each
  child name in order **layout entry → block → transform slot → skip**, appends
  unlisted transform nodes (never-drop rule), and honours an explicit `hide`.
- [ ] Created wrappers receive their BEM class (from the key's `data-name`) and a
  `data-section` via the existing `sections` map.
- [ ] Cycle / diamond resolution: each transform node is placed once; reference
  cycles (`a → b → a`) are detected (warn-and-skip vs hard error — resolve the
  SPEC-081 open question here).
- [ ] `projection.group` / `projection.relocate` are reproducible via `layout`;
  engine-blocks tests cover create / order / nest / append / hide.

## Dependencies

- None — this is the standalone engine primitive (independent of SPEC-082).

## References

- {% ref "SPEC-081" /%} — declarative structure assembly.

{% /work %}
