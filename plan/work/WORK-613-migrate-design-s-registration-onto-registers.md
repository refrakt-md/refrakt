{% work id="WORK-613" status="ready" priority="low" complexity="simple" source="SPEC-144" milestone="v0.39.0" tags="design,pipeline,registry,declarative" %}

# Migrate design's registration onto `registers`

The second reachable plugin in {% ref "SPEC-144" /%}'s reach table.
`plugins/design/src/pipeline.ts` (92 lines) has the same shape as storytelling's,
only smaller. Move its registration onto `registers` declarations and delete the
hooks.

Under the same D4 gate as {% ref "WORK-612" /%}: a registry snapshot taken before,
asserted after, with order included.

## Acceptance Criteria

- [ ] A registry snapshot over the design fixtures is captured before the migration and asserted after it — types, ids, scopes, `sourceUrl`s, `data` bags and registration order
- [ ] design's `register` and `aggregate` hooks are deleted, not merely unused
- [ ] Anything left in `plugins/design/src/pipeline.ts` is code the declaration genuinely cannot express, and the resolution says what it is

## Blocked by

- {% ref "WORK-611" /%}

## References

- {% ref "SPEC-144" /%} — reach table, D4

{% /work %}
