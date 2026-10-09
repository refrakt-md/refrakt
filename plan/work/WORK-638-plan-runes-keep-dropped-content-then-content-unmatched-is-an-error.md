{% work id="WORK-638" status="done" priority="high" complexity="moderate" source="SPEC-145" tags="runes,content-model,plan,correctness" milestone="v0.41.0" pr="refrakt-md/refrakt#700" %}

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

- [x] `milestone` keeps its `##` sections, so a milestone's body renders
- [x] `work`, `bug` and `decision` keep preamble content that is not a paragraph, for example with a catch-all preamble field
- [x] Rerunning WORK-631's measurement over `plan/` reports no `content-unmatched` finding
- [x] `CONTENT_UNMATCHED_LEVEL` in `packages/runes/src/lib/index.ts` is raised to `error`, and the docs and tests that state the severity are updated
- [x] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy, or the drift is reviewed and explained

## Approach

Fix the content models first, and only then raise the severity. Raising first would fail
the build for every project with a plan directory. `refrakt plan` reads entities
structurally, not through the content model, so the CLI is not affected either way.

## References

- {% ref "WORK-631" /%}: the report, and the measurement in its resolution.
- {% ref "SPEC-145" /%} D11.

## Resolution

Completed: 2026-10-09

Branch: `claude/v041-plan-runes-keep-content`
PR: refrakt-md/refrakt#700

### What was done
- `plugins/plan/src/tags/milestone.ts`: the `goals`/`notes` sequence fields are replaced by one catch-all `body` field (`match: 'any'`), the same shape `spec` uses. The goals list, notes and every `##` section render in the body, in authored order. Top-level `---` is stripped.
- `plugins/plan/src/tags/{work,bug,decision}.ts`: a catch-all `intro` preamble field after `description`, and an `intro` slot (`region`, `omitWhenEmpty`, `role: body`). It keeps blockquotes, lists, fences, tables and `---` written before the first `##`.
- `plugins/plan/src/config.ts`: the Work, Bug and Decision layouts place `intro` between `tags` and `body`.
- Lumina `work.css`, `bug.css`, `decision.css`: `__intro` uses the body's type scale. Blockquotes in it are styled like `spec`'s, and a trailing `---` is hidden. `milestone.css` gains the blockquote rule for its body.
- `plan/work/WORK-224`: unescaped backslash-escaped backticks that had turned an inline `{% codegroup %}` into a real, unclosed tag.
- `CONTENT_UNMATCHED_LEVEL` is `error`. These were updated to state the new severity:
  - `docs/configuration/reference.md` and `extend/rune-authoring/content-models.md`;
  - the plan rune pages;
  - `validate-content.test.ts` and `composed-character.test.ts`.
- New `plugins/plan/test/kept-content.test.ts`. `emits-equivalence` gains `intro: 'body'` in its sections table; its snapshot is untouched.
- Contracts (both copies): `intro` is added to the three layouts.
- Changeset `content-unmatched-error.md` (minor) states the behaviour change and the author's fix: add a field, or set `rawBody`.

### Measurement
WORK-631's measurement, rerun over `plan/` (908 files):
- Before: 803 nodes in 200 files: milestone 500/34, work 264/148, bug 37/16, decision 1/1, plus codegroup 1/1 from the malformed WORK-224.
- After: **0**.
- `refrakt validate` on `main` and `plan` (and `plan --deep`): 0 findings. `plan-site` builds clean.

### Notes
- The slot is `intro`, not `preamble`. `preamble` is a header role, and the engine special-cases `data-name="preamble"`; this content reads as the opening of the body.
- A preamble that opens with a blockquote before its lead paragraphs puts those paragraphs in `intro`, not `blurb`. That keeps the authored order.
- `plan/` used as a site still has 265 pre-existing findings from other ids: literal tag syntax in prose. They are outside this item, and `plan/` is not a configured site.

{% /work %}
