---
'@refrakt-md/transform': minor
'@refrakt-md/lumina': patch
'@refrakt-md/skeleton': patch
'@refrakt-md/cli': patch
---

**A context modifier is now also an attribute.** A rune nested in a parent its config declares under `contextModifiers` gets `data-in="<parent>"` beside its `--in-<parent>` class, and a rune whose tint resolves gets a `data-tinted` flag beside its `--tinted` class. Both classes stay. Select the attributes in theme CSS: they are part of the output's contract, which classes will not be once a theme can choose its own (SPEC-196).

Lumina and the skeleton now select `[data-in="…"]` in place of the context-modifier classes, and `data-rune` / `data-media-position` in place of the `--featured` and `--cover` static-modifier classes, each wrapped in `:where()` so no rule's specificity changed. `staticModifiers` is deprecated. `refrakt scaffold-css` writes the attribute form, `refrakt inspect --audit` looks for it, and the structure contract records each context modifier's `attributeSelector`.
