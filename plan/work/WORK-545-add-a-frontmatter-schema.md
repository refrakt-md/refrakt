{% work id="WORK-545" status="done" priority="high" complexity="moderate" source="SPEC-126" milestone="v0.33.0" tags="content,schema,frontmatter,dx" %}

# Add a frontmatter schema

Frontmatter has no machine-readable description. Add
`packages/content/frontmatter.schema.json`, publish it on the versioned routes
{% ref "BUG-004" /%} built, and make `Frontmatter` derive its documented members
from it.

## Why this is worth doing on its own

**Editors gain inline validation and autocomplete for frontmatter in `.md`
files, which nothing provides today.** That is the first benefit; feeding the
generated reference is the second.

Writing it also forces four fields into the open. `type`, `id`, `created`, and
`modified` are read by `page-entities.ts` and `timestamps.ts` through the
interface's `[key: string]: unknown` index signature — they are undeclared *and*
undocumented. `type` is the field that drives the entire entity registry: it is
what makes `/runes/rune-catalog` work, and an author cannot currently learn it
exists from the page that claims to list frontmatter fields.

## Acceptance Criteria
- [x] `packages/content/frontmatter.schema.json` describes every frontmatter field refrakt itself consumes
- [x] `type`, `id`, `created`, and `modified` are declared, with descriptions
- [x] `icon`, `tint`, `tint-mode`, and `tint-lock` are declared
- [x] `Frontmatter` no longer hides consumed fields behind the index signature
- [x] The index signature stays — arbitrary custom fields remain supported
- [x] The schema is served at the versioned and unversioned URLs, like the other two
- [x] A drift test guards it against the `Frontmatter` interface, as `config-schema.test.ts` does for the config schema
- [x] Every property carries a `description`

## Approach

Reuse the machinery already in place. `site/src/lib/schema-versions.ts`
enumerates versions and stamps `$id`; adding a third schema is a `SCHEMA_FILES`
entry plus two routes. The `$id` in the source file stays unversioned so the
packaged copy cannot go stale, matching the other two.

Model the drift test on `config-schema.test.ts` — extract the interface members
from `packages/content/src/frontmatter.ts` and assert coverage both ways. That
test found two discrepancies nobody had spotted by hand; the same approach
should be pointed at this interface from the start rather than retrofitted.

**The index signature is a feature, not an oversight.** Runes and pipeline hooks
read arbitrary author fields. The schema describes what refrakt consumes; it
does not close the set, and it should not set `additionalProperties: false`.

## Blocked by

- {% ref "WORK-541" /%} — do the types reorganisation before adding a second schema drift test, so both tests read stable paths

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**`packages/content/frontmatter.schema.json`** — 18 properties, every one with
a description. Open set: no `additionalProperties: false`.

**`packages/content/src/frontmatter.ts`** — `type`, `id`, `created` and
`modified` declared, each with a note naming the consumer that reads it. The
index signature keeps its own comment explaining that it is deliberate.

**`site/src/lib/schema-versions.ts`** — `packageDir(name)` replaces
`transformPackageDir()`, and `SCHEMA_FILES` carries a package per schema. The
frontmatter schema ships in `@refrakt-md/content`, not `transform`.

**Two routes** mirroring the existing pair, plus `files` widened in
`packages/content/package.json` so the schema is published.

**`packages/content/test/frontmatter-schema.test.ts`** — 9 tests: drift both
ways, every property described, the four formerly-hidden fields asserted by
name, and validation cases including the open set and the `tint: null` reset.

**`docs/configuration/schema.md`** — a table of all three published schemas and
an editor-configuration snippet for validating frontmatter.

### Notes

- Verified against the built site rather than tests alone: both URLs resolve,
  `$id` is stamped per version, and the full `v0.11`→current range is served.
- The `files` field would have silently omitted the schema from the published
  package — `transform` lists its two schemas explicitly and `content` listed
  only `dist`.
- Full suite 4300 passing.

{% /work %}
