{% work id="WORK-723" status="done" priority="high" complexity="moderate" source="SPEC-196" tags="behaviors, svelte, layouts, attributes, prefix" milestone="v0.50.0" pr="refrakt-md/refrakt#803" %}

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

- [x] The code-block wrapper (`packages/runes/src/nodes.ts:146`) and the table wrapper (`nodes.ts:426`) carry a data attribute beside their hard-coded class
- [x] The mobile panel, the search trigger's key hint and the docs sidebar in `packages/transform/src/layouts.ts` carry data attributes beside their classes
- [x] The 14 selectors in the table select attributes, and the 3 dead selectors are removed
- [x] `datatable.ts` and `compare.ts`, which read the table and code-block wrappers back, select the new attributes
- [x] The 13 selectors of behaviour-injected classes select a `data-name` the behaviour now sets
- [x] `ThemeShell.svelte` selects the docs sidebar by attribute
- [x] A test fails on any `.rf-` selector in `packages/behaviors/src` and the Svelte components (string literals passed to `querySelector`, `querySelectorAll`, `closest`, `matches` and `classList.contains`)
- [x] A behaviour test runs each changed behaviour on output rendered with a non-`rf` prefix
- [x] Both contract copies are regenerated if the new layout attributes appear in them

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

## Resolution

Completed: 2026-11-12

Branch: `claude/rune-composition-layout-convention-hkqrzx`

### What was done
- Emitted elements: `drawer.ts`, `elements/diagram.ts`, `elements/map.ts`, `mockup.ts`, `datatable.ts` select the `data-name` each rune already emits (`close`, `container`, `frame`, `scroll`); confirmed with `refrakt inspect`.
- New twins: `packages/runes/src/nodes.ts` gives the fence wrapper `data-wrapper="code"` and the table wrapper `data-wrapper="table"`; `compare.ts` and `datatable.ts` (transforms) and the `copy` behaviour read them. `packages/transform/src/layouts.ts` gives the mobile panels `data-mobile-panel="menu"|"nav"` (all four layouts) and the sidebars `data-sidebar="docs"|"plan"|"blog"`; `mobile-menu.ts` and `ThemeShell.svelte` select them.
- Behaviour-built UI: chart (`rendered`), audio (`player`, `chapter`), datatable (`sort-indicator`), search dialog (`input`, `results`, `empty`, `result`) get a `data-name` at creation and are selected by it; juxtapose finds its clicked button from the array it holds; copy's button is `data-copy-button`.
- Dead selectors removed: `.rf-map__fallback`, and section-nav's `.rf-plan-relationships` lookup (nothing has emitted it since the plan runes moved to `relationships`; re-pointing it would have added a nav entry).
- Tests: `packages/behaviors/test/no-class-reads.test.ts` (class selectors, class reads, class writes on elements not created; mutation-checked); `packages/content/test/behaviours-other-prefix.test.ts` (tabs, reveal, datatable, copy, drawer through schema + engine with prefix `zz`); `packages/content/test/layout-chrome-behaviours.test.ts` (every built-in layout's panels and sidebars, mobile-menu and search wired by attribute).
- SPEC-196 D6 records the names chosen; `site/content/extend/theme-authoring/layouts.md` documents `data-mobile-panel`. Changeset: behaviors minor; runes, transform, svelte, lumina, skeleton patch.

### Notes
- **Not `data-codeblock`** for the fence wrapper: that attribute already tells every renderer (html.ts, Svelte, React, Vue) that an element's children are raw highlighted HTML, so it would have left the wrapper's children unescaped.
- **The search key hint needs no new attribute**: every layout chrome entry already gets `data-name` from its `ref`, so it is `[data-name="search-kbd"]`. But no built-in layout renders it: a chrome entry with an `svg` returns before building its children. Filed as BUG-055; the key-hint test uses the markup the chrome system would emit.
- **Coverage of the non-`rf` prefix test**: tabs, reveal, datatable, copy, drawer, mobile-menu and search run on real output with prefix `zz`. map, diagram and mockup are web components or need layout measurement (Leaflet, Mermaid, computed styles) and are not exercised there; their selector swaps are covered by the source guard, and the `data-name`s they select were confirmed with `inspect`.
- The spec counted 13 behaviour-injected selector sites; 12 were selectors, and the 13th was `tabs` reading the first button's class, removed under WORK-724.
- Contracts did not change: layout chrome is not in the structure contract, and the fence and table wrappers are Markdoc node output, not rune structure.

{% /work %}
