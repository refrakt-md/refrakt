---
'@refrakt-md/runes': patch
'@refrakt-md/editor': patch
---

`sandbox`'s `context` attribute now takes effect. The sandbox transform never emitted it, so the design plugin always resolved a sandbox to the `default` design-context token set: `context="dark"` got `default`, and an undefined scope got `default` with no warning. `context` is now a field in the rune's `data-rune-fields` bag. A named scope gets its own token set, an unknown scope gets none and raises `Sandbox references design context "…" which is not defined on any page`, and a sandbox with no `context` still gets `default`. The editor's block preview reads the same field, so it matches the build.
