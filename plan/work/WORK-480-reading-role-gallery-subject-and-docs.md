{% work id="WORK-480" status="done" priority="low" complexity="simple" source="SPEC-108" milestone="v0.26.0" tags="reading,prose,gallery,docs" %}

# Reading-role gallery subject + docs

Visually regression-guard the reading treatment and document the registers for authors. Per
{% ref "SPEC-108" /%} Implications + Work breakdown 4.

## Scope

- Add a **prose subject** to the gallery — a long body rendered at each register (`fine`/`ui`/
  `prose`), including the editorial-header composition (`elevation="flush" width="full"
  prominence="display" reading="prose"`) so the measure-vs-width independence is guarded in light +
  dark.
- **Docs**: a reading-role section in the surfaces / theme-authoring docs (how the theme interprets
  `reading="prose"`), and the `fine`/`ui`/`prose` registers documented for content authors.

## Acceptance Criteria

- [x] The gallery grows a prose subject rendering a long body at each register, including the editorial-header composition (light + dark), so the reading treatment is regression-guarded.
- [x] Docs: a reading-role section in the surfaces / theme-authoring docs, and the `fine`/`ui`/`prose` registers documented for content authors.

## Dependencies

- {% ref "WORK-477" /%} — defaults to exercise in the gallery subject.
- {% ref "WORK-478" /%} — the Lumina treatment being guarded and documented.

## References

- Spec: {% ref "SPEC-108" /%} Implications (gallery prose subject), §5 (editorial-header composition).

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-108-gallery-docs`

### What was done
- **Gallery reading subject** (`packages/cli/src/commands/gallery.ts`): a new `readingCells()` emits a long body at each register (`fine`/`ui`/`prose`) plus the editorial-header composition (`elevation=flush width=full reading=prose dropcap=true`) as a synthetic `reading` gallery group, so it rides the existing light/dark documents and per-cell clipping. Added `reading`/`dropcap` to `UNIVERSAL_AXES` so the per-rune variant matrix skips them (showcased once here instead of expanding fine/ui/prose × dropcap across every rune).
- **Universal reading/dropcap forwarding fix** (`packages/runes/src/lib/index.ts`): `createContentModelSchema` forwarded `width`/`elevation`/etc. onto the output tag but never `reading` or `dropcap`, so an author `reading=`/`dropcap=` override never reached the engine — and `dropcap` was wholly non-functional after WORK-478 removed textblock's own copy in favour of the universal one. Surfaced while building the editorial-header cell. Added the two forwards.
- **Regression tests** (`packages/runes/test/textblock.test.ts`): schema-level assertions that `reading=`/`dropcap=` reach the rune tag. The transform `reading.test.ts` uses synthetic tags and bypassed the schema, which is why the gap shipped.
- **Docs**: reading-register section in `site/content/extend/theme-authoring/dimensions.md` (vocabulary, resolution precedence, measure-vs-width independence with CSS, dropcap, the editorial-header composition); author-facing Reading section + axes-table row in `site/content/runes/surfaces.md`.

### Notes
- Contracts unchanged — `data-reading`/`data-dropcap` are emitted conditionally on author/rune state, not part of the default structure, so `contracts.test.ts` stayed green. 1868 runes/transform/lumina/cli tests pass.
- The `prominence` dial is a header-rune affordance and a no-op on a bare `textblock` body, so the gallery's editorial-header cell omits it (it warned otherwise); the docs example carries the full composition on a header-bearing rune.

{% /work %}
