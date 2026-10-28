{% work id="WORK-656" status="done" priority="medium" complexity="moderate" source="SPEC-160" tags="lumina, skeleton, css, section, dimensions, composition" milestone="v0.43.0" pr="refrakt-md/refrakt#724" %}

# The eyebrow is a section role, and its linked pill moves into the sections dimension

An eyebrow that holds a link renders as a pill with a stretched link. The rules for it are
copied into nine runes: `hero`, `cta`, `section`, `feature`, `pricing`, `reveal`, `tabs`,
`accordion` and `steps`. Each copy is in both `packages/skeleton/styles/runes/` (the stretched
link) and `packages/lumina/styles/runes/` (the pill), so there are 18 copies of one pattern. A
theme has to restyle the pill in nine places, and a new rune with an eyebrow gets it only by
copying it again. `card` has an eyebrow but no pill.

The cause is that the eyebrow has no section role. The shared roles (`header`, `preamble`,
`title`, `description`, `body`, `footer`, `media`) are styled by `[data-section]` in the
sections dimension, whatever the rune; the eyebrow is styled only by its BEM class. With
`section` as the composition base ({% ref "ADR-041" /%}) and `hero` and `cta` heading for
compositions with no rune CSS (SPEC-160 D7), the pill belongs to the anatomy, not to each rune.
This follows the same pattern as {% ref "WORK-654" /%}, which moves button CSS out of `hero` and
`cta`.

## Acceptance Criteria

- [x] `eyebrow` is a section role: header anatomy stamps `data-section="eyebrow"` on the eyebrow of every rune that has one, `section` and `card` included
- [x] The closed role vocabulary admits it: the `RuneConfig.sections` role union in `packages/transform/src/types.ts`, `HEADER_ROLES` in `packages/transform/src/section-roles.ts`, and any contract or `inspect` code that lists the roles
- [x] The stretched link moves to `packages/skeleton/styles/dimensions/sections.css` and the pill to `packages/lumina/styles/dimensions/sections.css`, keyed on `[data-section="eyebrow"]:has(a)`
- [x] The per-rune `__eyebrow:has(a)` rules are deleted from all nine runes in both packages; only rune-specific adjustments stay (for example hero's `margin: 0 0 1rem` and `max-width: none`)
- [x] The plain eyebrow's type (size, weight, tracking, uppercase, primary colour) moves to the dimension too where the nine copies agree, and stays per rune where they differ, each difference listed in the resolution
- [x] The nine runes look unchanged in the gallery, in light and dark, with and without a linked eyebrow; a linked eyebrow in `card` now renders as a pill, which the changeset names
- [x] The CSS coverage test passes, with `UNSTYLED_BLOCKS` / `KNOWN_MISSING_SELECTORS` updated if the per-rune selectors leave them
- [x] Contracts are regenerated on both copies and the diff reviewed; the SEO baseline does not move
- [x] The theme-authoring dimensions page documents the `eyebrow` role

## Approach

- `pageSectionAutoLabel` in `packages/runes/src/config.ts` already names the eyebrow
  (`eyebrow: 'eyebrow'`), and `sectionSections` in `packages/runes/src/tags/section.ts` maps
  `preamble`, `headline` and `blurb` to roles. Adding `eyebrow: 'eyebrow'` to the shared
  mappings is the likely change; check each of the nine runes' `sections` config, since not all
  of them use `sectionSections`.
- `hero.css` raises specificity (`.rf-hero .rf-hero__eyebrow`) to beat `.rf-hero p`. Check that
  the dimension's attribute selector still wins there, or keep that one override in `hero.css`.
- Independent of WORK-654, and best landed after {% ref "WORK-652" /%} so `section`'s header
  anatomy is final.

## References

- {% ref "SPEC-160" /%}: D7, a composed `hero` and `cta` with no rune CSS.
- {% ref "ADR-041" /%}.

## Resolution

Completed: 2026-10-26

Branch: `claude/v0-43-0-review-ny4nl1`

### What was done
- `eyebrow` added to the role vocabulary:
  - `RuneConfig.sections` (`packages/transform/src/types.ts`);
  - `SectionRole` (`packages/runes/src/lib/index.ts`);
  - the slot roles (`slots.ts`);
  - the dimension audit's list (`packages/cli/src/lib/dimension-audit.ts`).
- `eyebrow: 'eyebrow'` added to the `sections` maps of `hero`, `cta`, `section`, `card`, `feature`, `pricing`, `reveal`, `tabs`, `accordion` and `steps`.
- Stretched link: `packages/skeleton/styles/dimensions/sections.css`. Type and pill: `packages/lumina/styles/dimensions/sections.css`. Both keyed on `[data-section="eyebrow"]`.
- The 18 per-rune pill copies are deleted, and the per-rune type declarations removed.
- `hero` and `cta`: their `p` rules exclude the eyebrow (`p:not([data-section="eyebrow"])`), because `.rf-hero p` (0,1,1) would otherwise beat the attribute selector.
- Docs: `site/content/extend/theme-authoring/dimensions.md` documents the role and the pill.

### Differences kept per rune
- **Margin.** `0 0 0.5rem` for `feature`, `pricing`, `reveal`, `tabs`, `accordion` and `steps`; `0` for `section`; `0 0 1rem` for `hero`; `0 0 0.75rem` for `cta`; `0 0 var(--rf-spacing-xs)` for `card`.
- **`max-width: none`** on `hero` and `cta`, plus `line-height: relaxed`, which they used to inherit from their `p` rules.
- **`card`'s size**, `--rf-text-xs`.
- The nine copies agreed on size `sm`, semibold, tracking wider, uppercase and primary, which are now the dimension's.

### Notes
- **Deviation from criterion 2:** `eyebrow` is *not* in `HEADER_ROLES` (`section-roles.ts`) or prominence's header set.
  - Both decide whether a rune "has a header": one gates `prominence`, the other the missing-header-role lint for `title`/`header`/`headline`/`name` slots.
  - An eyebrow alone is not a title. Adding it would have offered `card` a `prominence` it cannot honour, and would let an eyebrow satisfy the title lint.
- **Contracts do not change** for the role: the contract does not record `sections`.
- **Gallery check, light and dark, with and without linked eyebrows:**
  - unchanged for the nine;
  - `card`'s linked eyebrow is now a pill, 10px taller, as intended and named in the changeset.

{% /work %}
