{% work id="WORK-545" status="ready" priority="high" complexity="moderate" source="SPEC-126" milestone="v0.33.0" tags="content,schema,frontmatter,dx" %}

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
- [ ] `packages/content/frontmatter.schema.json` describes every frontmatter field refrakt itself consumes
- [ ] `type`, `id`, `created`, and `modified` are declared, with descriptions
- [ ] `icon`, `tint`, `tint-mode`, and `tint-lock` are declared
- [ ] `Frontmatter` no longer hides consumed fields behind the index signature
- [ ] The index signature stays — arbitrary custom fields remain supported
- [ ] The schema is served at the versioned and unversioned URLs, like the other two
- [ ] A drift test guards it against the `Frontmatter` interface, as `config-schema.test.ts` does for the config schema
- [ ] Every property carries a `description`

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

{% /work %}
