{% work id="WORK-637" status="in-progress" priority="high" complexity="moderate" source="SPEC-145,SPEC-153" milestone="v0.41.0" tags="docs,composition,dx" %}

# The authoring guide for composed runes

Composition ships to users in this milestone, and {% ref "SPEC-153" /%} D9 makes the definition
file the user-facing authoring surface. Today the only documentation is a `PluginRune` note in
`rune-authoring/authoring-overview.md`. Add a page under `site/content/extend/rune-authoring/`
written from {% ref "SPEC-145" /%}'s "template vocabulary, in one place" table. The guide is
the spine of that table rather than a summary of it.

It covers:

- **The file.** Frontmatter is the input declaration and the body is the output template.
  Slot names are the join. The filename is the rune's name.
- **The vocabulary:**
  - `{% slot %}` with fallback content;
  - `each` and `$each` (its fields are exactly `emitAttributes`);
  - `$attrs`;
  - `{% metablock %}`;
  - Markdoc's `{% if %}`, with D17's content-model consequence;
  - why there is no iteration tag.
- **What may be placed (D12).** The intersection of the no-peer-schema and no-required-parent
  exclusions, stated as one list, and the runes the WORK-621 survival test keeps out.
- **Every construction-time error**, with what it means and how to fix it.
- **Where definitions go.** A plugin's `runeDir` versus a project's `runes.dir`, the precedence
  rule, and why `schema` is allowed in one and not the other (D25), each with its reason.
- **The `bond` and `character` definitions** as worked examples, taken from the tested
  fixtures rather than retyped.

## Blocked by

- {% ref "WORK-633" /%}
- {% ref "WORK-634" /%}

## Acceptance Criteria

- [ ] A composed-runes page exists under `site/content/extend/rune-authoring/`, linked from the overview, covering the file format, the full vocabulary, the placeable set and where definitions go
- [ ] The authoring guide states the placeable set as one list — the intersection of the no-peer-schema and no-required-parent exclusions — not as two rules to combine (SPEC-145 D12)
- [ ] The authoring guide states the project-versus-package asymmetry with the reason rather than as a convention (SPEC-153)
- [ ] Every construction-time error message the compiler can produce is listed with its cause and fix, and a test fails if a new error is added without a docs entry
- [ ] The worked examples are included from the tested fixture files, so the docs cannot drift from definitions that are proved to build
- [ ] `refrakt validate` passes on the new page, and `refrakt.stale` reports no page pointing at the changed paths without review

{% /work %}
