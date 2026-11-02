{% work id="WORK-675" status="done" priority="low" complexity="simple" source="ADR-047" tags="docs, runes, composition, content-model, authoring" milestone="v0.46.0" pr="refrakt-md/refrakt#755" %}

# The content-boundaries guide documents the narrative field

The "Content boundaries" section of `site/content/extend/rune-authoring/patterns.md` puts
"Story, editorial, famous quotes" outside `recipe`. {% ref "ADR-047" /%} adds a case: a rune may
declare one narrative field that takes `{% textblock %}` and `{% mediatext %}`, so a template can
place the story between the rune's parts. A site's own composed rune can declare one today.

## Acceptance Criteria

- [x] The section keeps its three tests and adds the narrative-field case, with the food-blog layout (name, image and times; the story; a card with ingredients and method) as its example
- [x] The "What goes where" table notes that a story may sit inside a rune that declares a narrative field, wrapped in an editorial rune
- [x] The guide states the two rules: one narrative field per rune, never mapped to structured data, and that loose prose inside the rune is still outside its content model
- [x] The composed-runes guide shows a definition with a `story` field and a template placing it
- [x] `npm run format:md:check` passes

## References

- {% ref "ADR-047" /%}.
- {% ref "WORK-674" /%}: the checks the guide describes.

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `site/content/extend/rune-authoring/patterns.md`:
  - the "What goes where" Recipe row notes the narrative field;
  - a new "The narrative field" subsection with the food-blog example, the two rules (one per rune, never structured data) and the loose-prose boundary.
- `site/content/extend/rune-authoring/composed-runes.md`:
  - "A narrative field" shows a definition with a `story` field and its template (a `section chrome`, the story, a `card`);
  - the Errors table gains `narrative-field-twice` and `narrative-field-mapped`.
- `npm run format:md:check` passes.

{% /work %}
