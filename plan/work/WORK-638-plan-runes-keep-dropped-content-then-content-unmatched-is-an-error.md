{% work id="WORK-638" status="in-progress" priority="high" complexity="moderate" source="SPEC-145" tags="runes,content-model,plan,correctness" milestone="v0.41.0" %}

# Plan runes keep the content their content models drop, then content-unmatched becomes an error

{% ref "WORK-631" /%} added `content-unmatched`: validation reports an authored node that no
content-model field matches, because the transform drops it. It shipped as a **warning**
because the measurement found that four shipped runes drop real content today, all in the plan
plugin. The plan site renders each entity through its rune (`{% expand %}`), so the loss reaches
plan.refrakt.md.

Measured over this repo's `plan/` directory (907 files), as of WORK-631:

| Rune | Dropped nodes | Files | Cause |
|---|---|---|---|
| `milestone` | 500 | 34 of 40 | A `sequence` model (title, description, goals, notes). Every `##` section and everything after it is dropped. |
| `work` | 262 | 147 of 637 | The preamble takes only a heading and paragraphs. A blockquote (`> Ref: …`), list, fence, table or `---` before the first `##` is dropped. |
| `bug` | 37 | 16 of 34 | The same preamble as `work`. |
| `decision` | 1 | 1 | The same preamble as `work`. |

Core runes, the other eight plugins, the rune fixture corpus, the SEO baseline fixtures,
`site/content` and `plan-site/content` reported none.

## Acceptance Criteria

- [ ] `milestone` keeps its `##` sections, so a milestone's body renders
- [ ] `work`, `bug` and `decision` keep preamble content that is not a paragraph, for example with a catch-all preamble field
- [ ] Rerunning WORK-631's measurement over `plan/` reports no `content-unmatched` finding
- [ ] `CONTENT_UNMATCHED_LEVEL` in `packages/runes/src/lib/index.ts` is raised to `error`, and the docs and tests that state the severity are updated
- [ ] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy, or the drift is reviewed and explained

## Approach

Fix the content models first, and only then raise the severity. Raising first would fail
the build for every project with a plan directory. `refrakt plan` reads entities
structurally, not through the content model, so the CLI is not affected either way.

## References

- {% ref "WORK-631" /%}: the report, and the measurement in its resolution.
- {% ref "SPEC-145" /%} D11.

{% /work %}
