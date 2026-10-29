{% work id="WORK-668" status="done" priority="medium" complexity="complex" source="SPEC-161" tags="runes, composition, marketing, testimonial, section, seo, codemod" milestone="v0.44.0" pr="refrakt-md/refrakt#734" %}

# testimonial is a composition over section, with a codemod for its byline

`testimonial` becomes one `section` with a portrait media zone, the rating and byline
`metablock`s, and the quote slot ({% ref "SPEC-161" /%} D1). Its author and role move from a
`**Name** — Role` paragraph to attributes, so the schema table can publish them.

## Acceptance Criteria

- [x] A composed `testimonial` definition, per SPEC-161 D1's sketch, places one `section` with `media-position="start"` and `media="portrait"`, with no `{% if %}`
- [x] It declares `defaults: { elevation: flat, density: compact }`, and renders a surface and the round avatar for every `variant`
- [x] `variant` is a declared attribute emitted as `data-variant` on the root
- [x] The byline renders through the `lead` layout ({% ref "WORK-667" /%}), with the author name as lead and the role visible at compact density
- [x] Its JSON-LD matches the plugin's `Review` graph (`reviewBody`, `Person` author, `Rating`) at both harvest points, compared against the SEO baseline rather than re-recorded
- [x] A codemod rewrites `**Name** — Role` paragraphs into `author` and `role` attributes, using the plugin's own parser, and is run over this repository's content
- [x] A page still written the old way reports `content-unmatched` at error severity rather than rendering the paragraph
- [x] Rendered beside the plugin `testimonial` for every gallery fixture; every difference is listed and explained
- [x] The plugin `testimonial` is unchanged; replacing it is a later step

## Blocked by

- {% ref "WORK-663" /%}
- {% ref "WORK-667" /%}
- {% ref "WORK-652" /%}: the portrait media zone (v0.43.0)

## References

- {% ref "SPEC-161" /%}: D1, D6.
- {% ref "WORK-639" /%}: the rating becomes `marks` when it lands; not required here.

## Resolution

Completed: 2026-10-29

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/runes/test/fixtures/composed/testimonial.md`: SPEC-161 D1's sketch, with one adjustment: the rating meta field is the plugin's shape (`rating: { total: rating-total }`, no `metaType`, which the vocabulary does not have). It is one `section`, `media-position="start"` and `media="portrait"`, with no `{% if %}`; `defaults: { elevation: flat, density: compact }`; `variant` a declared attribute (`data-variant` on the root); `aliases: [review]`.
- The byline is a `lead` block (WORK-667): `<cite data-lead>` name, then the role, with no `data-meta-rank`.
- `plugins/marketing`: `parseAttribution` extracted from the rune's transform (behaviour identical) and exported. `migrate-testimonial.ts` rewrites the paragraph into `author` / `role` using it. A new `./cli-plugin` export serves it as `refrakt marketing migrate-testimonial [paths…] [--apply]`.
- `packages/content/test/composed-testimonial.test.ts`:
  - the definition, every variant's surface and avatar, and the lead byline;
  - `content-unmatched` at error severity for the old form;
  - JSON-LD equal to the SEO baseline for `testimonial` and `testimonial.comma` at both harvest points, after the codemod;
  - the codemod over every testimonial in the repository;
  - every gallery cell beside the plugin.
- Shared CSS: a beside split with a portrait media zone sizes its column to the portrait (`layouts/split.css`); a `lead` value is upright (`font-style: normal`), since it is often a `<cite>`.
- Docs: the command in `site/content/docs/cli/cli-overview.md`.

### The codemod over this repository
- A dry run over `site/content`, `contracts`, `plan`, `plugins` and `packages/runes/fixtures` finds 5 testimonials in 4 files (`site/content/index.md`, `site/content/runes/marketing/testimonial.md`, both SEO fixtures).
- Every one migrates with no skip and leaves no `content-unmatched`; a test holds this.
- Two plan files' testimonial examples have no attribution paragraph and are skipped.
- The rewrite is not applied to those files: they render through the plugin `testimonial`, which takes no `author` attribute. It is applied when the plugin is replaced.

### Differences from the plugin testimonial (Lumina, light and dark)
- **Layout:** the round avatar sits beside the content (the section's portrait split), not after the byline.
- **The quote:** a prose `blockquote` (rule and quote mark, upright) rather than the plugin's plain italic quote, since no testimonial CSS applies.
- **The byline:** the name is a `<cite>`, emphasised by the `lead` layout.
- **The root:** carries `data-author` / `data-role`, because a meta field resolves against the rune's own values (SPEC-145 D7), and has no `rf-testimonial*` classes.
- **`variant`:** reaches the root as written. The plugin's always reads `card`, because it emits the variant meta as a child rather than a property (a plugin defect, unchanged here).
- **Comma attribution:** the comma stays in the role, as BUG-019 records for the plugin; the codemod reads it the same way, and the baseline graph matches.

### Notes
- The plugin `testimonial` is unchanged; replacing it is a later step.

{% /work %}
