{% work id="WORK-685" status="done" priority="high" complexity="simple" source="SPEC-181,SPEC-161" tags="runes, marketing, testimonial, staging, migration, codemod, seo" milestone="v0.44.0" pr="refrakt-md/refrakt#736" %}

# The plugin testimonial accepts author and role attributes, and the codemod is applied to this repository

The composed `testimonial` ({% ref "WORK-668" /%}) takes `author` and `role` attributes and
reports a `**Name** — Role` paragraph as `content-unmatched`. The plugin `testimonial` takes no
`author` attribute. So WORK-668 built `refrakt marketing migrate-testimonial` but did not apply
it: the rewritten content would not have rendered through the plugin.

The staging site renders the same content as `main` ({% ref "SPEC-181" /%} D7). The plugin
`testimonial` therefore learns the attributes first, and the codemod is then applied.

## Acceptance Criteria

- [x] The plugin `testimonial` declares `author` and `role` attributes; when either is set it is used and the paragraph is not parsed, and when neither is set the paragraph is parsed as today
- [x] Its JSON-LD (`Review`, `Person` author with `jobTitle`, `Rating`) and rendered byline are the same whether the attribution is written as attributes or as the paragraph, asserted by a test
- [x] `refrakt marketing migrate-testimonial --apply` is run over `site/content` and the SEO fixtures, rewriting the 5 testimonials in 4 files that WORK-668 found
- [x] `seo:baseline:check` and `contracts --check` pass with the migrated fixtures, without regenerating the baseline
- [x] The testimonial reference page documents `author` and `role` as the way to write the byline, and notes that the paragraph form still works for now
- [x] A changeset records the attributes and the codemod

## Blocks

- {% ref "WORK-681" /%}

## References

- {% ref "SPEC-181" /%}: D7, the rollout's gate 3.
- {% ref "SPEC-161" /%}: D1.
- {% ref "WORK-668" /%}: the composed testimonial and the codemod.
- {% ref "BUG-019" /%}: the comma attribution; the codemod and the plugin read it the same way.

## Resolution

Completed: 2026-10-30

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `plugins/marketing/src/tags/testimonial.ts`: `author` and `role` attributes. When either is set it is used and the paragraph is not read; otherwise `parseAttribution` reads the paragraph as before.
- `plugins/marketing/test/seo.test.ts`: the `Review` / `Person` / `Rating` graph and the rendered tree are identical in both forms, and attributes win over a paragraph.
- `refrakt marketing migrate-testimonial --apply` run over `site/content` and `contracts/seo-baseline/fixtures`: 5 testimonials in 4 files.
- `seo:baseline:check` passes without regenerating; contracts are unchanged.
- The testimonial reference page documents `author` / `role` and the codemod, and notes the paragraph still works. The plugin snippet (and `packages/vscode/snippets/runes.json`) uses the attributes.
- Changeset `testimonial-author-role`.

### Notes
- `testimonial.comma.md` now pins the comma role as an attribute value (`role=", CTO at Acme"`), which is how the plugin's parser read it (BUG-019). Its parser probe now lives in the codemod's reading of the paragraph.
- `packages/vscode/snippets/runes.json` was edited by hand to match, since `tsx` was not available to run `generate-snippets`.

{% /work %}
