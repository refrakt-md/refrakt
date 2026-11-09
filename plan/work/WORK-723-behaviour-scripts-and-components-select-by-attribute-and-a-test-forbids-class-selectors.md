{% work id="WORK-723" status="ready" priority="high" complexity="moderate" source="SPEC-196" tags="behaviors, svelte, layouts, attributes, prefix" milestone="v0.50.0" %}

# Behaviour scripts and components select by attribute, and a test forbids class selectors

{% ref "SPEC-196" /%} D6. `@refrakt-md/behaviors` has 27 sites that select by `.rf-` class, and the
Svelte components 2 more (`ThemeShell.svelte` selects `rf-docs-sidebar` at lines 76 and 95). The
prefix is configurable, so any theme with another prefix breaks them today. They move to
`data-name`, `data-rune` and the other vocabulary attributes.

The D6 measurement split the sites:

- **14 select classes something else emits.** Most already have an attribute twin:

  | Behaviour | Selects | Becomes |
  |---|---|---|
  | `drawer` | `.rf-drawer__close` | `[data-name="close"]` |
  | `rf-diagram` | `.rf-diagram__container` | `[data-name="container"]` |
  | `rf-map` | `.rf-map__container`, `ol` | `[data-name="container"]`, `[data-name="pins"]` |
  | `mockup` | `.rf-mockup__frame`, and the host's `parentElement` | `[data-name="frame"]`, `closest('[data-section="media"]')` |
  | `datatable` | `.rf-datatable__scroll` | `[data-name="scroll"]` |
  | `copy` | `rf-codeblock` (×2) | a new attribute on the code-block wrapper |
  | `mobile-menu` | `.rf-mobile-panel` and `--nav` (×3) | new attributes on the layout chrome |
  | `search` | `.rf-search-trigger__kbd` | a new attribute on the layout chrome |

  Three are dead and are deleted: `.rf-map__fallback` and `section-nav`'s
  `.rf-plan-relationships` (×2) have no emitter anywhere.
- **13 select classes the behaviour injected itself.** They keep working without classes, but the
  test below forbids them too, so the elements they target get a `data-name` and the selectors
  move to it. The rest of the UI behaviours build is {% ref "WORK-725" /%}.

## Acceptance Criteria

- [ ] The code-block wrapper (`packages/runes/src/nodes.ts:146`) and the table wrapper (`nodes.ts:426`) carry a data attribute beside their hard-coded class
- [ ] The mobile panel, the search trigger's key hint and the docs sidebar in `packages/transform/src/layouts.ts` carry data attributes beside their classes
- [ ] The 14 selectors in the table select attributes, and the 3 dead selectors are removed
- [ ] `datatable.ts` and `compare.ts`, which read the table and code-block wrappers back, select the new attributes
- [ ] The 13 selectors of behaviour-injected classes select a `data-name` the behaviour now sets
- [ ] `ThemeShell.svelte` selects the docs sidebar by attribute
- [ ] A test fails on any `.rf-` selector in `packages/behaviors/src` and the Svelte components (string literals passed to `querySelector`, `querySelectorAll`, `closest`, `matches` and `classList.contains`)
- [ ] A behaviour test runs each changed behaviour on output rendered with a non-`rf` prefix
- [ ] Both contract copies are regenerated if the new layout attributes appear in them

## Approach

- Land {% ref "BUG-048" /%} first: `nav-menubar.ts:30` is one of these selectors, and the bug
  should be fixed with its own test before this rewrite touches the file.
- Follow the existing naming: a wrapper the engine did not make still gets `data-name` where it is
  a named part of a rune, and a layout chrome element gets the same kind of name the layout's
  other regions use. Record the names chosen in SPEC-196's "What exists".
- `mockup` selects its host's parent today. `closest('[data-section="media"]')` says what it means
  and survives a wrapper being added.
- The test reads source, as the `Markdoc.parse` guard does. Matching string literals is enough;
  dynamic class names built at runtime are the business of {% ref "WORK-724" /%}.

## Blocked by

- {% ref "BUG-048" /%}

## References

- {% ref "SPEC-196" /%} D6, and "What exists, measured".
- {% ref "ADR-048" /%}: implementation order, step 1.

{% /work %}
