{% work id="WORK-394" status="ready" priority="medium" complexity="moderate" source="SPEC-009" tags="editor,edit-hints,runes,plugins" %}

# Close editHints coverage gaps across rune packages

`editHints` drive click-to-edit in the block editor; every rune without
them is one where clicking a section silently does nothing. Coverage today
is 93/130 runes (71.5%): business, design, docs, places, and storytelling
are at 100%, but core is at 58% (35/60), plan at 45% (5/11), media at 60%
(3/5), learning at 67% (2/3), and marketing at 80% (12/15). Close the gaps
using the established {% ref "SPEC-009" /%} playbook (visible elements as
`refs`/`data-name`, hints declared in the rune's config).

## Acceptance Criteria
- [ ] Every core rune in `packages/runes/src/config.ts` either declares
  `editHints` or carries a short comment stating why none apply (e.g.
  fully structure-injected, no author-editable sections).
- [ ] plan, media, learning, and marketing plugin runes reach the same
  bar (hints declared or explicitly waived with rationale).
- [ ] Hint kinds follow existing conventions: `inline` for
  headlines/body, `link` for actions, `code` for commands/snippets,
  `image`/`icon` for media, `none` for generated content.
- [ ] Click-to-edit verified in the editor for a sample of newly covered
  runes in each package (at minimum one per hint kind per package).
- [ ] A coverage check (test or script) counts runes with
  `editHints`-or-waiver so regressions are visible in CI.

## Approach
- Audit per package starting from the gap list in the 2026-06 editor
  investigation; for each uncovered rune, check whether its visible
  sections are `refs` (have `data-name`) — move from `properties` to
  `refs` where needed, per the SPEC-009 pattern
  (`packages/runes/src/lib/component.ts`).
- Declare hints in the rune's `RuneConfig` (`editHints` field,
  `packages/transform/src/types.ts`); plugins carry theirs in
  `Plugin.theme.runes`.
- Where a rune genuinely has nothing section-editable, record the waiver
  instead of inventing hints.
- Coverage check: derive the rune list from `baseConfig` +
  `Plugin.theme.runes` (same derivation as the Lumina CSS coverage test)
  and assert hints-or-waiver.

## References
- {% ref "SPEC-009" /%} — the migration playbook and per-rune status
  record.
- `packages/transform/src/types.ts` (`editHints`),
  `packages/runes/src/config.ts`, `plugins/*/src` theme configs,
  `packages/editor/app/src/lib/components/BlockCard.svelte` (hint
  consumption).

{% /work %}
