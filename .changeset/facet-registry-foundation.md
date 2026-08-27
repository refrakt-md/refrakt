---
"@refrakt-md/transform": patch
---

Restructure the identity transform's universal-axis resolution as a facet
registry (SPEC-124, WORK-517 + WORK-518).

`transformRune` resolved every universal rune axis inline in one ~800-line
function with lettered sub-steps (`1b`…`1h`). This migrates the first four axes
— `elevation`, `prominence`, `cover` and `content-place` — into
`packages/transform/src/facets/`, where each axis is a module that declares its
dependencies and returns its contributions as data for a driver to merge.

Internal only: no public API changes, and no change to rendered output.
Attribute order, class-string order, inline-style declaration order and warning
text are all byte-identical, and the 630 pre-existing transform tests pass
unmodified.

Recorded because this sits on the code path every rune renders through. If a
regression escapes the test suite, this is the changelog entry to bisect to.

Notable behaviour that is deliberately *preserved* rather than fixed:

- `elevation` still passes unknown values through without validation — the
  closed set is enforced at parse time by the schema's `matches`, not by the
  engine.
- Warn-once diagnostics keep process-wide dedupe scope (matching the
  module-level `*_WARNED` sets they will replace). Narrowing that scope is a
  separate, deliberate decision under WORK-524.
