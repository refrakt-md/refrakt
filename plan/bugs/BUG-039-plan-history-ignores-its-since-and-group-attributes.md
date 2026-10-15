{% bug id="BUG-039" status="confirmed" severity="minor" source="SPEC-152" tags="plan, plan-history, attributes" %}

# plan-history ignores its since and group attributes

`{% plan-history %}` declares five attributes (`plugins/plan/src/tags/plan-history.ts`): `id`,
`limit`, `type`, `since` and `group`. The rune emits all five as metas, and the post-process
resolver that builds the output (`resolvePlanHistory`, `plugins/plan/src/pipeline.ts:910`)
uses only three of them.

- **`since` is never read.** The resolver reads `id`, `limit`, `type` and `group`
  (`pipeline.ts:914-917`); nothing reads `since`. The global feed is never filtered by time.
- **`group` is read and never used.** It is assigned at `pipeline.ts:917` and not referenced
  again. `group="entity"` renders the same commit-grouped feed as the default.

The rune's own documentation shows both as working: `{% plan-history since="7d" /%}`
(`site/content/runes/plan/plan-history.md:52`), and the schema describes `group` as "Global mode
grouping: commit or entity."

## Steps to Reproduce

1. On a site with plan content in a git repository, add `{% plan-history since="1d" /%}`.
2. Add `{% plan-history group="entity" /%}` beside it.
3. Build the site.

## Expected

The first feed shows only events from the last day. The second groups events by entity.

## Actual

Both render the same unfiltered, commit-grouped feed as `{% plan-history /%}`, with no warning.

## Environment

- `@refrakt-md/plan` at the current `main`.

## Resolution options

{% ref "SPEC-172" /%} records the direction for repository history in general, and questions
whether `plan-history` survives as its own rune. Either option fixes the bug:

- **Implement both.** `since` filters by event date (`7d`, `30d` or an ISO date, as documented);
  `group="entity"` groups the global feed by entity instead of by commit.
- **Remove both** from the schema and the documentation, so the rune stops promising what it
  does not do.

Removing them is the smaller change while the rune's future is open. Leaving the attributes in
place and doing nothing is the one outcome this bug rules out.

{% /bug %}
