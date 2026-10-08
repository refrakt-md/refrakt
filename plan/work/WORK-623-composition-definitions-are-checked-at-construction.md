{% work id="WORK-623" status="done" priority="high" complexity="moderate" source="SPEC-145" milestone="v0.40.0" tags="runes,composition,validation,dx" pr="refrakt-md/refrakt#683" %}

# A composition definition is checked at construction

Every rejection {% ref "SPEC-145" /%} decides at definition load or schema construction,
in one place, so that a bad definition fails with its rune and the offending name rather
than rendering silently wrong. Between them, D11 and D26 match every content-model field
to exactly one slot.

The bulk of this item is the error messages. Each check names the rune and the thing it
rejected, and the tests assert the message as well as the throw.

## Blocked by

- {% ref "WORK-622" /%}

## Acceptance Criteria

- [x] A template containing `data`, `snippet` or `include` is rejected at definition load, naming the rune and the offending tag (D4)
- [x] Declaring more than one of slot declaration / template / `transform` is rejected at schema construction (D5)
- [x] A content-model field that no slot places is a build error naming the field — content is never silently dropped (D11)
- [x] A template naming a slot the content model does not produce is rejected at schema construction, naming the slot (D26)
- [x] A template placing the same slot twice is rejected at schema construction, naming the slot (D26)
- [x] `each` on a single-valued field is rejected at schema construction, naming the slot (D26)
- [x] Inside an `each` slot, `$each` exposes exactly the content model's `emitAttributes`; naming any other field is rejected at schema construction, naming the field (D26)
- [x] A composition cycle is detected and reported by rune name, at schema construction rather than at render
- [x] A composition template placing a rune that declares a top-level schema `type` is rejected at build, naming both runes; a subordinate emitter (`figure`, `gallery`) is allowed (D9)
- [x] A template placing a rune that declares `requiresParent` is rejected at definition load, naming both runes and the required parent (D12)
- [x] A composed rune ships no CSS, and a definition that tries to is rejected naming the rune (D2)

## Resolution

Completed: 2026-10-08

Branch: `claude/v040-composition-templates`
PR: refrakt-md/refrakt#683

### What was done
- `packages/runes/src/lib/composition.ts`: every construction-time check in one place, each message naming the rune and the offending thing:
  - `data` / `snippet` / `include` in a template (D4);
  - an unplaced content-model field (D11);
  - a slot naming no field, a slot placed twice, `each` on a single-valued field, a `$each` field outside `emitAttributes`, `$each` outside an `each` slot (D26);
  - an undeclared `$attrs`;
  - a template placing its own rune (self-cycle).
- `packages/runes/src/lib/composition.ts`, `checkCompositions` (catalog-wide, run by `mergePlugins` through `checkComposedCatalog` before any render): cycles by rune name, D9 peer types naming both runes and both types, and D12 required parents naming both runes and the parent (matched by `data-rune`).
- `parseCompositionDefinition`: rejects the CSS keys (`css`, `style`, `styles`, `stylesheet`, `block`, `class`) per D2, a second emit path (`transform`, `emits`, `slots`) per D5, `layout` per D7, and a key restating the name (SPEC-153 D9).
- `validatePlugin` rejects a hand-written theme config for a composed rune.
- `createContentModelSchema`: D5's exclusion extended to three paths (`transform` / `emits` / `template`).
- Tests: `packages/runes/test/composition.test.ts` asserts each message as well as the throw.

### Notes
- D9 is implemented relationally, per D9's own "The rule is relational" subsection. The check fires only when the composed rune declares a type and places a non-subordinate peer; a no-schema wrapper over `accordion` passes. The criterion's unconditional wording would ban the `cooking-post` case that D9 permits.
- D12 compares the required parent with the placed parent's `data-rune`, not its tag (`tabs` renders as `tab-group`).
- Contracts and the SEO baseline are unchanged.

{% /work %}
