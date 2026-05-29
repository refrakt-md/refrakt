{% work id="WORK-277" status="done" priority="medium" complexity="simple" source="SPEC-072" tags="collection,formatter,runes" milestone="v0.16.0" %}

# Promote humanize to a public shared formatter

Move the private `humanize()` helper (`packages/runes/src/collection-resolve.ts:44`, currently used for `fields` table headers) into the shared markdoc functions module as a public formatter alongside `currency`/`date`/`number`/`join`. This removes any need for a plan-specific edge-label function — the `relationships` rune (WORK-278) labels kinds with `{% humanize($kind) %}`.

## Acceptance Criteria
- [x] `humanize(value)` is a public markdoc function usable anywhere markdoc runs (`{% humanize($item.data.status) %}`).
- [x] Casing is Title Case ("Blocked By", "In Progress"), preserving existing `collection` `fields` header output.
- [x] A camelCase word boundary is added (`/([a-z])([A-Z])/ → "$1 $2"`) so `prepTime` → "Prep Time".
- [x] `collection`'s header logic calls the promoted function (no behavior change beyond the camelCase improvement).
- [x] Unit tests cover kebab/snake/camelCase inputs and the plan edge kinds (`blocked-by` → "Blocked By", `depends-on` → "Depends On").

## Approach
Lift `humanize` into the shared functions module (where `currency`/`date`/`number`/`join` live), register it as a `ConfigFunction`, and re-point `collection-resolve.ts` at it. Add the camelCase boundary before the existing `-`/`_`→space and word-capitalization steps.

## Dependencies
None — small, independent; prerequisite for WORK-278's kind labels.

## References
- {% ref "SPEC-072" /%} — Capability 4.

## Resolution

Completed: 2026-05-26

Branch: `claude/v0.16.0`

### What was done
- `packages/runes/src/functions.ts` — added a public `humanize(value)` helper + a `humanize` markdoc `ConfigFunction`, registered in the shared `functions` map. Title Case, with a camelCase split (`/([a-z0-9])([A-Z])/`) before the `-`/`_`→space and word-capitalize steps.
- `packages/runes/src/collection-resolve.ts` — removed the private `humanize`; imports the shared one (header rendering unchanged in behavior, gains the camelCase improvement).
- `packages/runes/src/index.ts` — re-export `humanize`.
- `packages/runes/test/functions.test.ts` — cover kebab/snake/camelCase + the plan edge kinds, and the `{% humanize() %}` markdoc path.

### Notes
- The `humanize` ConfigFunction is now available to `relationships` (WORK-278) for `{% humanize($kind) %}` kind labels — no plan-specific label function needed.

{% /work %}
