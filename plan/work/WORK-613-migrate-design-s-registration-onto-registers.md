{% work id="WORK-613" status="done" priority="low" complexity="simple" source="SPEC-144" milestone="v0.39.0" tags="design,pipeline,registry,declarative" pr="refrakt-md/refrakt#669" %}

# Migrate design's registration onto `registers`

The second reachable plugin in {% ref "SPEC-144" /%}'s reach table.
`plugins/design/src/pipeline.ts` (92 lines) has the same shape as storytelling's,
only smaller. Move its registration onto `registers` declarations and delete the
hooks.

Under the same D4 gate as {% ref "WORK-612" /%}: a registry snapshot taken before,
asserted after, with order included.

## Acceptance Criteria

- [x] A registry snapshot over the design fixtures is captured before the migration and asserted after it — types, ids, scopes, `sourceUrl`s, `data` bags and registration order
- [x] design's `register` and `aggregate` hooks are deleted, not merely unused
- [x] Anything left in `plugins/design/src/pipeline.ts` is code the declaration genuinely cannot express, and the resolution says what it is

## Blocked by

- {% ref "WORK-611" /%}

## References

- {% ref "SPEC-144" /%} — reach table, D4

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-registers`
PR: refrakt-md/refrakt#669

### What was done
- Snapshot first (commit `4867d2c`): `plugins/design/test/registry-snapshot.test.ts` over `test/fixtures/registry-site` (default scope, a `dark` scope registered twice for last-write-wins, three sandboxes) records each `design-context` registration in order and the tokens `postProcess` injects. Unchanged after the migration and passing.
- `design-context` declares `registers: { entity: { idFrom: 'scope', data: { json: 'tokens' } } }` — the `{ json }` data form was added to the vocabulary for exactly this: one source holding the JSON object that is the bag.
- `plugins/design/src/pipeline.ts`: `register`, `aggregate` and `walkTags` deleted.
- Editor: `/api/aggregated` sends Maps as plain objects; the sandbox preview and `context=` autocomplete read `design.entityByName` instead of `design.contexts`.

### What is left in pipeline.ts, and why
- `postProcess` (+ `mapTags`): writes the registered tokens into every `sandbox` as a `design-tokens` meta. That rewrites another rune's output from aggregated data — resolution, not registration — which SPEC-144 D2 keeps imperative (and the bounded-resolution follow-up does not cover, since `sandbox` is not this plugin's rune). It now reads the name index (`entityByName.get(scope)?.data`) rather than the deleted `contexts` map.

### Notes
- Pre-existing bug, not fixed here (out of scope): `sandbox` never emits its `context` attribute (no property in its transform), so `postProcess` always resolves `default`; `context="dark"` and `context="missing"` both get the default tokens and no warning. The snapshot records this as-is. Needs its own bug item.
- Edge: `scope=""` written explicitly used to register under `default` (`|| 'default'`); it now warns and registers nothing. The attribute defaults to `default`, so only an explicit empty string is affected.

{% /work %}
