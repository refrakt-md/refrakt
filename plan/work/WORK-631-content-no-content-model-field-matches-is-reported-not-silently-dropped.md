{% work id="WORK-631" status="done" priority="high" complexity="moderate" source="SPEC-145" tags="runes,content-model,composition,dx,correctness" milestone="v0.41.0" pr="refrakt-md/refrakt#693" %}

# Content no content-model field matches is reported, not silently dropped

Found by {% ref "WORK-625" /%}, the composed `character`. A `{% hint %}` an author wrote
before the first section was matched by no preamble field and dropped, with no error and no
warning. The composed definition works around it with a catch-all `body` preamble field.
SPEC-145 records the finding beside the `character` worked example.

**D11 promises against this silent loss but checks the other direction.** It requires that
every declared *field* is placed by a slot. Nothing checks that every *authored node* is
matched by a field. So content can still vanish between the author's file and the content
model, by another route.

This applies to any content model, not just compositions. A tree-owning rune with a narrow
preamble loses unmatched content the same way, so the fix belongs in the content-model
resolver, not in the composition layer. First measure how many shipped runes drop content
today, so the change can be staged as a warning before an error if needed.

## Acceptance Criteria

- [x] The content-model resolver reports an authored node that no field matches, naming the rune, the node type and its source line
- [x] The report reaches `refrakt validate` and the build output as a structured finding, not only a console line
- [x] The number of shipped runes and fixtures that trip it today is measured and recorded, and the severity (warning or error) is chosen from that measurement
- [x] A composed rune without a catch-all field, given content no field matches, produces the report; the composed `character` fixture keeps its `body` field and produces none
- [x] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy

## Resolution

Completed: 2026-10-08

Branch: `claude/v041-unmatched-content`
PR: refrakt-md/refrakt#693

### What was done
- `packages/runes/src/lib/resolver.ts`: every resolver (`resolveSequence`, `resolveDelimited`, `resolveSections`, `resolve`) takes an optional `UnmatchedSink`, and `findUnmatchedContent` runs the transform's own resolution with one attached, over the same `tint`/`bg`-filtered children. A node counts as dropped when it is:
  - left after the last sequence field;
  - skipped by a required field;
  - preamble content in a `sections` model with no `fields`;
  - in a `---` group beyond the declared zones;
  - in a section body the section model leaves unmatched.

  Whitespace, soft breaks and comments are ignored. A `custom` model is never reported, because its `processChildren` owns every child.
- `packages/runes/src/lib/index.ts`: `createContentModelSchema` adds a `validate` hook, `auditUnmatchedContent`, that raises `content-unmatched` for each dropped node, for example `{% hint %} at line 4 matches no content-model field of {% character %} and is dropped from the output`. Markdoc anchors the finding on the rune's line; the message names the node's own line. The severity is the exported `CONTENT_UNMATCHED_LEVEL`.
- A new `rawBody` option exempts runes whose transform reads the body as raw source; `deferBody` implies it. `packages/runes/src/tags/sandbox.ts` sets it.
- `packages/content/src/validate.ts`: `content-unmatched` joins `DEFAULT_VALIDATION_IDS`, so it reaches `refrakt validate`, MCP `refrakt.validate` (file, line, severity, id) and the build's pipeline warnings. It can be demoted with `validation.disableIds`.
- Tests:
  - resolver unit tests for each drop path and exemption;
  - `composed-character.test.ts`: the old "dropped silently" pin now asserts the report, and the stored definition (catch-all `body`) reports nothing in all three fixtures;
  - `validate-content.test.ts`: file, line and severity end to end, with the build agreeing;
  - the allow-list pin in `validate.test.ts`.
- Docs: the `content-unmatched` row in `docs/configuration/reference.md`, and "Content no field matches" in `extend/rune-authoring/content-models.md`. SPEC-145's note beside the `character` example now says the drop is reported.
- Filed WORK-638 for the follow-up, and added a changeset (runes and content, minor).

### Measurement
The measurement script validated every `.md` with core plus all nine plugins, and the real `refrakt validate` ran on both sites. Counts are after the `rawBody`/`deferBody` exemption.
- Core rune fixtures (40), plugin and package test fixtures (34), SEO baseline fixtures (53), composed-storytelling fixtures: **0**.
- `refrakt validate` on sites `main` (`site/content`) and `plan` (`plan-site/content`): **0**.
- `plan/` (907 files), which plan.refrakt.md renders through `{% expand %}`: **800 dropped nodes in 198 files, from 4 runes**:
  - `milestone`: 500 nodes in 34 of 40 files. It uses a `sequence` model, so every `##` section is dropped.
  - `work`: 262 nodes in 147 of 637 files. The preamble takes only a heading and paragraphs, so a leading `> Ref:` blockquote, list, table, fence or `---` is dropped.
  - `bug`: 37 nodes in 16 of 34 files.
  - `decision`: 1 node.

  I confirmed the losses are real by transforming WORK-004 and the v0.41.0 milestone and checking that the text is absent.
- False positives found and handled:
  - `sandbox` and the `deferBody` runes (`collection`, `aggregate`, `relationships` and three plan runes) read their body as source. They are exempt through `rawBody`.
  - `data`, `include` and `snippet` inside `codegroup`/`diff` hit only when preprocess is skipped. The real validate tier runs preprocess and reports none.

### Severity: warning
The core and site corpora are clean, but four shipped plan runes drop real content in a corpus every plan-directory project has. As an error, it would fail those builds before their content models are fixed. The plan for raising it is WORK-638: fix the `milestone`, `work`, `bug` and `decision` content models, rerun the measurement to 0, then set `CONTENT_UNMATCHED_LEVEL` to `error`.

### Notes
- Contracts (both copies) and the SEO baseline are unchanged. `npm test`: 5546 passed.
- `rawBody` is a declaration on the schema builder, not new content-model vocabulary. Making `sandbox` a `custom` model would have changed what `reference` and the editor read from `schemaContentModels`.

{% /work %}
