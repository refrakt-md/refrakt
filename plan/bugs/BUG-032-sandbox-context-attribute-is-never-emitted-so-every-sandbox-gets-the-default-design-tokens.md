{% bug id="BUG-032" status="confirmed" severity="major" source="SPEC-002" tags="runes,sandbox,design,pipeline" %}

# Sandbox context attribute is never emitted, so every sandbox gets the default design tokens

`sandbox` declares a `context` attribute ("Shared context scope for multiple
sandboxes", `packages/runes/src/tags/sandbox.ts:92`), and the design plugin
reads it to choose which `design-context` token set to inject. The sandbox
transform never puts the value anywhere. The attribute is read nowhere in
`sandbox.ts` (lines 142–155 read the others), and `createComponentRenderable`
is called with no `properties` (`:247`), so the rune carries no
`data-rune-fields` entry and no `<meta data-field="context">`.

The consumers therefore always fall back:

- `plugins/design/src/pipeline.ts:36`: `readNodeField(tag, 'context') || 'default'`
  is always `'default'`.
- `packages/editor/app/src/lib/preview/block-renderer.ts:155`: looks for a
  `data-field="context"` child that never exists, so the editor preview
  falls back to `'default'` as well.

`git log -S` finds no version of `sandbox.ts` that emitted it, so this has
been broken since the attribute was added, not by a regression.

## Steps to Reproduce

1. On one page, write `{% design-context %}` and `{% design-context scope="dark" %}`,
   each with a different `{% palette %}`.
2. On another page, write `{% sandbox context="dark" %}…{% /sandbox %}` and
   `{% sandbox context="missing" %}…{% /sandbox %}`.
3. Build, and read the `design-tokens` meta injected into each sandbox.

`plugins/design/test/fixtures/registry-site` is exactly this setup, and
`plugins/design/test/fixtures/registry-snapshot.json` records the result
(captured for WORK-613, which recorded it as-is rather than fixing it).

## Expected

- `context="dark"` gets the `dark` token set.
- `context="missing"` gets nothing and produces the existing warning,
  `Sandbox references design context "missing" which is not defined on any page`.
- A sandbox with no `context` gets `default`.

## Actual

All three sandboxes get the `default` token set, and no warning is raised.
Named scopes have no effect anywhere: in the build, in the editor preview, or
for the `context=` autocomplete, which offers scopes that then do nothing.

## Fix

Emit `context` from the sandbox transform as a field (a `properties` meta),
so it lands in the rune's `data-rune-fields` bag where `readNodeField` reads
it. The editor's `block-renderer.ts` looks for a `data-field="context"` child
meta, and `createComponentRenderable` drops a pure data meta from the
children, so the editor must read the bag (`readField`) as well.

Two generated artifacts will change, and the change is the evidence:

- `plugins/design/test/fixtures/registry-snapshot.json`: the `injected`
  entries for the `dark` and `missing` sandboxes change, and the warnings
  list gains the "missing" warning. Regenerate it with
  `REFRAKT_WRITE_REGISTRY_SNAPSHOT=1` in the fix commit and explain the diff
  in the resolution. The `registrations` half must not change.
- Structure contracts: check whether a new `sandbox` field shows up, and
  regenerate both copies together if so.

## Environment

- `@refrakt-md/runes` 0.38.0, `@refrakt-md/design` 0.38.0, `main` at
  `cc9aaad` (after refrakt-md/refrakt#669)

## References

- {% ref "SPEC-002" /%}: the cross-page pipeline, whose design-context use case
  this is ("the sandbox rune is a context consumer")
- {% ref "WORK-613" /%}: found it while capturing the design registry snapshot

{% /bug %}
