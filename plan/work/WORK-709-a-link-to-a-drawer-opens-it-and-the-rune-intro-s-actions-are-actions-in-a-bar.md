{% work id="WORK-709" status="ready" priority="medium" complexity="moderate" source="SPEC-187" tags="drawer, actions, bar, context-modifier, lumina, rune-intro" milestone="v0.48.0" %}

# A link to a drawer opens it, and the rune intro's actions are actions in a bar

SPEC-187 D10–D12. The rune intro's `Install` and `Source` are text links built with `ref` and
`file-ref` (WORK-706): neither rune can carry an icon, the two render in different styles, and
`actions` cannot place them, because only those runes open a drawer. This item makes an ordinary link
open a drawer, gives `actions` a bar context, and moves the intro onto both.

## Acceptance Criteria

- [ ] A link whose target is a drawer on the same page — `[x](#id)`, `{% link href="#id" %}` or an `actions` item — gets the drawer's anchor and `data-target-type="drawer"`, and opens the drawer (D10)
- [ ] `#drawer-<id>` is accepted as well as `#<id>`; a drawer wins over a heading with the same id; a link to an id no drawer has is left unchanged
- [ ] `ref` and `file-ref` triggers render as before
- [ ] The drawer reference page documents triggering a drawer from a link, an `actions` item and `ref`
- [ ] `Actions` declares `contextModifiers: { bar: 'in-bar' }`, and `.rf-actions--in-bar` appears in both copies of the structure contract (D11)
- [ ] Lumina styles `.rf-actions--in-bar`: compact (the badges' height), tonal rather than filled, no fill on a primary action, an icon before the label; the skeleton keeps the row structural; CSS coverage passes
- [ ] An `actions` region whose items are links with an icon in their text ranks the first as primary, asserted by a test
- [ ] The intro data carries `sourceUrl`, the file on GitHub, built from the site's `repoUrl` and `repoBranch` (D12)
- [ ] The partial declares the Source drawer (`{% drawer id="rune-source" %}` around `{% snippet path=$row.source /%}` and the GitHub link) — or, if `snippet` cannot take `$row.path` inside `data`, `file-ref` gains a drawer `id` and the resolution records why
- [ ] The partial's right group is `{% actions %}` with `Install` (plugin runes only) and `Source`, each an icon and a label; the WORK-706 pipeline test passes against it
- [ ] Reviewed on a built page, light and dark, at 1280px and 390px: the actions read as actions, not prose links and not buttons, and match each other

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

{% /work %}
