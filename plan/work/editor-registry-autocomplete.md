{% work id="WORK-057" status="ready" priority="medium" complexity="moderate" tags="editor, pipeline" %}

# Editor Registry-Powered Autocomplete

> Ref: SPEC-002 (Cross-Page Pipeline — Registry-Powered Autocomplete)

Depends on: WORK-056 (Editor Background Entity Registry)

## Summary

The entity registry enables intelligent autocomplete throughout the editor. Since the registry contains every named entity across the project, the editor can suggest entity names, page references, and rune attributes as the author types.

## Acceptance Criteria

- [ ] Bold text autocomplete: typing `**Ves` suggests `Veshra` when a character entity with that name exists in the registry
- [ ] Autocomplete popup shows entity type and source page alongside the name
- [ ] Rune attribute autocomplete: typing `{% bond from="` suggests character and faction names from the registry
- [ ] Page reference autocomplete: in `nav`, `prerequisite`, and page-slug attributes, suggest from registered pages
- [ ] Design token autocomplete: inside `sandbox` CSS content, typing `var(--` suggests design tokens from the registry
- [ ] Term awareness: words matching registered `concept` terms show a subtle indicator (dotted underline) in the source view
- [ ] Cross-package attribute awareness: autocomplete for `character` attributes includes both core and extension attributes, indicating which package provides each

## Approach

Build on the background entity registry from WORK-056. Add completion providers to the editor's CodeMirror/Monaco instance that query the registry:

1. **Bold text provider:** Detect cursor inside `**...**`, query registry for entity names matching the partial text
2. **Attribute value provider:** Detect cursor inside a rune attribute value, determine the attribute name, query registry for appropriate entity types (e.g., `from`/`to` → characters + factions)
3. **Page reference provider:** Detect page slug attributes, query registry for all `page` entities
4. **Design token provider:** Detect `var(--` inside sandbox content, query registry for `design-token` entities
5. **Term indicator:** On document change, scan visible text for matches against `term` entities, apply decorations

## References

- SPEC-002 (Cross-Page Pipeline — Registry-Powered Autocomplete)
- WORK-056 (Editor Background Entity Registry)

{% /work %}
