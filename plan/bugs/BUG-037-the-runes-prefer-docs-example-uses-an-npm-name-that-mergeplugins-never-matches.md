{% bug id="BUG-037" status="confirmed" severity="minor" source="SPEC-153" tags="docs,plugins,config" %}

# The `runes.prefer` docs example uses an npm name that `mergePlugins` never matches

Found by {% ref "WORK-634" /%} (#695).

`site/content/extend/plugin-authoring/authoring.md` ("Name Collision Resolution") shows:

```json
"prefer": { "hero": "@my-org/custom" }
```

`extending-core.md` line 83 does the same (`"character": "my-package"`). But `mergePlugins`
matches a `prefer` value against the plugin's **short name**, not its npm package name. So the
documented form silently does nothing, and the collision resolves as if no preference were given.

## Steps to Reproduce

1. Configure two plugins that both define `hero`, and copy the docs example:
   `"runes": { "prefer": { "hero": "@my-org/custom" } }`.
2. Build a page using `{% hero %}`.

## Expected

The documented example works when copied.

## Actual

The preference is ignored with no warning. The collision resolves by the default rule.

## Fix

Either:
- correct the examples to the short name, and state which name is meant; or
- accept the npm name as well in `mergePlugins`.

The second is friendlier, since the npm name is the one a user sees in `refrakt.config.json`'s
`plugins` list. Either way, an unknown `prefer` value should warn rather than be ignored.

{% /bug %}
