{% work id="WORK-704" status="done" priority="high" complexity="simple" source="SPEC-181" tags="runes, composition, marketing, testimonial, go-live, seo" milestone="v0.48.0" pr="refrakt-md/refrakt#769" %}

# The composed testimonial goes live in the marketing plugin

The staged testimonial has been approved on staging.refrakt.md. Its final form places a featured
quotation ({% ref "WORK-700" /%}), so it goes live after that lands, on the path
{% ref "WORK-702" /%} opens.

## Gates (SPEC-181 rollout)

1. and 2. Reviewed, differences fixed or accepted: {% ref "WORK-691" /%}, then approved after WORK-700.
3. `author` / `role` attributes accepted by the plugin since v0.44.0, and the codemod applied to this
   repository ({% ref "WORK-685" /%}).
4. It places `pullquote`, so it depends on {% ref "SPEC-185" /%}, which is `accepted`.

## Acceptance Criteria
- [x] `testimonial.md` moves from `site/staged-runes/` into the marketing `runeDir` unchanged, and the `staging` site's `runes.prefer` entry for `testimonial` is removed
- [x] The plugin testimonial's schema, theme config entry and `testimonial.css` are removed, and the CSS coverage sets are updated
- [x] The `Review` / `Person` / `Rating` graph is unchanged by the SEO baseline comparison, and both copies of `contracts/structures.json` are regenerated
- [x] The `review` alias still resolves
- [x] The testimonial reference page describes the rune as a composition, and drops the note that the paragraph byline "still works for now" if the composition reports it
- [x] A breaking changeset and a migration note list what authors and themes lose (`rf-testimonial*` classes) and what changed

## Blocked by
- {% ref "WORK-700" /%}
- {% ref "WORK-702" /%}

## References
- {% ref "SPEC-181" /%}: the rollout gates and D5.
- {% ref "SPEC-182" /%}: the byline reinterpretation.
- {% ref "SPEC-185" /%}: D7, the featured quotation.

## Resolution

Completed: 2026-11-03

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#769

### What was done
- `site/staged-runes/testimonial.md` → `plugins/marketing/runes/testimonial.md`, unchanged; `testimonial` removed from the staging site's `runes.prefer`, leaving only `steps` staged.
- Removed the native testimonial: `plugins/marketing/src/tags/testimonial.ts` (and the `parseAttribution` export), its `Testimonial` theme entry, Lumina's and the skeleton's `testimonial.css`, and `plugins/marketing/test/testimonial.test.ts`.
- `plugins/marketing/fixtures/testimonial.md` replaces the inline fixture.
- `plugins/marketing/test/helpers.ts` loads the plugin's `runeDir` with slot markers declared, so the plugin's hand-written SEO intent tests run against the composed testimonial; they pass. The "same tree either way" test now ignores `data-rune-fields` and `data-slot`, the only differences between the two attribution forms.
- `composed-testimonial.test.ts` keeps the comparison's findings as assertions; `staging-site.test.ts` moves its shadowing tests to `steps`.
- Docs: testimonial page gains "How it is built"; a theme-authoring layout example no longer names `rf-testimonial`.

### Notes
- SEO baseline: the `Review` / `Person` / `Rating` graph is unchanged except the comma fixture's `jobTitle`, which loses its leading `", "` — BUG-019, fixed by the composition's attribution pattern and marked fixed.
- The `review` alias resolves to the composed testimonial (asserted).
- The reference page never carried the "still works for now" note in its current form; it documents both attribution forms as equal, which the composition keeps.

{% /work %}
