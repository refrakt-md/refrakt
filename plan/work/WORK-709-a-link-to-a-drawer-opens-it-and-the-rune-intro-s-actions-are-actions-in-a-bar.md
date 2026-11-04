{% work id="WORK-709" status="done" priority="medium" complexity="moderate" source="SPEC-187" tags="drawer, actions, bar, context-modifier, lumina, rune-intro" milestone="v0.48.0" pr="refrakt-md/refrakt#771" %}

# A link to a drawer opens it, and the rune intro's actions are actions in a bar

SPEC-187 D10–D12. The rune intro's `Install` and `Source` are text links built with `ref` and
`file-ref` (WORK-706): neither rune can carry an icon, the two render in different styles, and
`actions` cannot place them, because only those runes open a drawer. This item makes an ordinary link
open a drawer, gives `actions` a bar context, and moves the intro onto both.

## Acceptance Criteria

- [x] A link whose target is a drawer on the same page — `[x](#id)`, `{% link href="#id" %}` or an `actions` item — gets the drawer's anchor and `data-target-type="drawer"`, and opens the drawer (D10)
- [x] `#drawer-<id>` is accepted as well as `#<id>`; a drawer wins over a heading with the same id; a link to an id no drawer has is left unchanged
- [x] `ref` and `file-ref` triggers render as before
- [x] The drawer reference page documents triggering a drawer from a link, an `actions` item and `ref`
- [x] `Actions` declares `contextModifiers: { bar: 'in-bar' }`, and `.rf-actions--in-bar` appears in both copies of the structure contract (D11)
- [x] Lumina styles `.rf-actions--in-bar`: compact (the badges' height), tonal rather than filled, no fill on a primary action, an icon before the label; the skeleton keeps the row structural; CSS coverage passes
- [x] An `actions` region whose items are links with an icon in their text ranks the first as primary, asserted by a test
- [x] The intro data carries `sourceUrl`, the file on GitHub, built from the site's `repoUrl` and `repoBranch` (D12)
- [x] The partial declares the Source drawer (`{% drawer id="rune-source" %}` around `{% snippet path=$row.source /%}` and the GitHub link) — or, if `snippet` cannot take `$row.path` inside `data`, `file-ref` gains a drawer `id` and the resolution records why
- [x] The partial's right group is `{% actions %}` with `Install` (plugin runes only) and `Source`, each an icon and a label; the WORK-706 pipeline test passes against it
- [x] Reviewed on a built page, light and dark, at 1280px and 390px: the actions read as actions, not prose links and not buttons, and match each other

## Approach

- The link rewrite belongs where drawer ids are known for the page (`packages/runes/src/drawer-pipeline.ts`
  collects hoisted drawers); a link to a declared drawer must be found the same way.
- `actions` already reads its size from `--action-padding` / `--action-font-size`, which `marquee`
  sets. The bar context sets them too, and the tonal look keys on `.rf-actions--in-bar`.
- Links that are values inside bars (the plan plugin's) are out of scope and keep prose styling.

## Blocks

- {% ref "WORK-708" /%}

## References

- {% ref "SPEC-187" /%}: D3, D10, D11, D12.
- {% ref "WORK-706" /%}: the partial this changes.

## Resolution

Completed: 2026-11-04

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#771

### What was done
- `packages/runes/src/drawer-pipeline.ts`: `bindDrawerLinks`, called last in the core postProcess chain (`config.ts`). A link to a drawer on the page, by `#id` or `#drawer-<id>`, gets the drawer's anchor and `data-target-type="drawer"`; a drawer wins over a heading; unknown ids, off-page links and reference-rune triggers are untouched. Tests: `packages/runes/test/drawer-links.test.ts`.
- `Actions` gains `contextModifiers: { bar: 'in-bar' }` (both contract copies regenerated). Lumina `actions.css`: compact (20px, the badges' 19px), tonal, no primary fill, 1em icon; skeleton `actions.css`: stays a row on a phone.
- Lumina `bar.css`: a bar group's paragraph takes no block margin — its prose margin made one group taller and set the two groups at different heights.
- `site/content/_partials/rune-intro.md`: `Install` / `Source` as `actions` items with icons, linking to `#rune-install` / `#rune-source`; the Source drawer is declared around `{% snippet path=$row.source /%}` with a GitHub link.
- `scripts/rune-intro.mjs`: `sourceUrl` (from the main site's `repoUrl` / `repoBranch`) and a `core` flag.
- Docs: drawer page "Triggering from a link"; actions page "In a bar"; `_partials/README.md`.
- `packages/content/test/rune-intro.test.ts`: triggers' hrefs and ranks for a plugin and a core rune; the snippet drawer holds the file.

### Notes
- `snippet` takes its `path` from `$row` inside `data`, so `file-ref` did not need an `id` attribute.
- `refrakt format` refuses to re-indent `{% else /%}` (it would change the parse), so the partial uses two `if` blocks; `$row` is not substituted inside a function's arguments, so `not($row.plugin)` was always true — hence the `core` flag.
- Reviewed on a built site (hero, testimonial, hint; trial edits reverted), light and dark at 1280px and 390px; both drawers open from their actions.

{% /work %}
