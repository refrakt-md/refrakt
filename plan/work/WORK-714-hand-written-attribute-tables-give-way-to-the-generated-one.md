{% work id="WORK-714" status="done" priority="medium" complexity="simple" source="SPEC-193" tags="docs, runes, attributes" milestone="v0.49.0" pr="refrakt-md/refrakt#781" %}

# Hand-written attribute tables give way to the generated one

SPEC-193 D3. About 24 pages carry hand-written attribute tables or attribute-by-attribute prose
beside the generated table; one (card) already contradicts it, and plan/work and plan/spec end with
two orphaned rows.

## Acceptance Criteria
- [x] The hand-written tables listed in SPEC-193 F2 are removed; a section about an attribute explains the task and shows it
- [x] card's stale `elevation` values are gone with its table
- [x] The orphaned rows on plan/work and plan/spec are removed
- [x] bar and deflist get the generated attribute include; link's hand-written table is replaced by it
- [x] `check-rune-docs` fails on a hand-written attribute table on a rune page

## Blocked by
- {% ref "WORK-712" /%}

## References
- {% ref "SPEC-193" /%}: D3, F2.

## Resolution

Completed: 2026-11-05

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done
- Layout tables removed from card, section, hero, feature, recipe, steps, realm, faction and playlist, replaced by short "Place the media" prose; hero's cover table became one sentence on `scrim`; card's stale `elevation` values removed.
- Child tables (Tier, Release, Member, Entry, Day, Stop) removed; the parent's generated include renders them.
- bento "Common attributes" → "Tint a cell"; tint's axis table → "Tint without a child rune"; layout's Region/Layout tables → "Extending a parent layout"; sandbox data-binding table → prose.
- Orphaned `created`/`modified` rows removed from plan/work and plan/spec.
- `link` registered as a catalogue rune (`packages/runes/src/index.ts`), so its page gets the generated intro and attribute include; `scripts/rune-intro.mjs` maps its source to `nodes.ts`.
- `region` is now a child of `layout` in `PAGELESS`, so its table renders on the layout page.
- `check-rune-docs` `handWrittenTables` now flags any table under `## Attributes` and any "Attribute"-headed table elsewhere on a rune page, ignoring fences and indented examples; unit test added.

### Notes
- bar and deflist already had the include (WORK-712).
- collection, aggregate and relationships keep their sort/group prose: those sections are tasks and carry behaviour the generated table does not.

{% /work %}
