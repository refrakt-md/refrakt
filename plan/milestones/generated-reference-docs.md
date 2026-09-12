{% milestone name="v0.33.0" status="active" %}

# v0.33.0 — Generated reference docs

Reference documentation stops being hand-copied. Every page in the docs that
claims to enumerate a complete set — configuration fields, frontmatter fields,
a rune's attributes — renders from the source that already knows the answer,
guarded by a test that fails when the two diverge.

## Why

A reference table is a copy of something the code already knows, and every copy
drifts silently: nothing fails, a reader just never learns the field exists.
Two audits in v0.32.0 found the same disease in three places:

- **Config** — WORK-539 found eight discrepancies in `refrakt.config.schema.json`,
  five of them real fields that appeared in no reference at all.
- **Frontmatter** — `docs/content.md` lists ten fields; the interface declares
  fourteen, and four more (`type`, `id`, `created`, `modified`) are consumed
  through its index signature. `type` drives the entire entity registry.
- **Rune attributes** — {% ref "BUG-006" /%} found 4 of 13 attribute tables
  disagreeing with their schemas, including one documenting an attribute that
  was never implemented and one omitting a rune's only *required* attribute.

Each was fixed by hand. None of the fixes stopped the next one.

## What lands

Three specs, sharing one mechanism: a repo script emits a committed JSON
artifact, a page renders it with `{% data %}`, and a colocated test fails when
the artifact is stale.

- {% ref "SPEC-127" /%} — per-row templates for `data`. The rendering half, and
  the prerequisite for the other two.
- {% ref "SPEC-126" /%} — the configuration and frontmatter references,
  including a published `frontmatter.schema.json` that also gives editors
  inline validation for frontmatter, which nothing provides today.
- {% ref "SPEC-128" /%} — rune attribute tables, the largest surface. The
  reference data already exists as `refrakt reference --format json`.

Plus the two documentation bugs carried over from v0.32.0, which are the
symptoms this milestone treats the cause of:
{% ref "BUG-005" /%} and {% ref "BUG-006" /%}.

## The through-line

*Prose is written, exhaustiveness is generated, and the two are linked rather
than interleaved.*

The guard is a test, not a `--check` flag — this repo has two `--check` flags
and neither runs in CI, while `scripts/check-rune-docs.mjs` catches real drift
because its colocated test runs under `npm test`. Generation follows that shape.

## Minor, not patch

`{% data %}` gaining a body is a new authoring capability. Everything else is
additive or documentation, but Changesets runs in fixed mode, so the release is
a minor.

{% /milestone %}
