---
"@refrakt-md/transform": minor
"@refrakt-md/runes": minor
"@refrakt-md/lumina": minor
"@refrakt-md/cli": minor
---

**Surface axes — `elevation` is now a depth ladder (SPEC-107).** The `elevation` attribute is decomposed into three composable axes so the same content rune can read as a contained card *or* a full-bleed hero with no rune fork:

- **`elevation`** — a depth ladder `sunken | flush | flat | raised | floating | overlay` (was the `none|sm|md|lg` shadow scale). Each rune ships a `defaultElevation` (a `card` is `flat`, a `hint` is `flush`, a `chart` is `sunken`); styled by `[data-elevation]`, no BEM modifier class.
- **`prominence`** — the page-section-header family `quiet | normal | prominent | display`, re-pointing the section title type size.
- **`width`** — the existing layout/bleed axis (`compact|narrow|wide|full`), now documented as the third, layout-side axis.

**Breaking change + deprecation window.** The old `elevation="none|sm|md|lg"` values are deprecated. They still resolve — `none`→`flat`, `sm`/`md`→`raised`, `lg`→`floating` — with a build-time warning, and will be removed in a future release. Run the codemod to migrate authored content:

```sh
refrakt migrate elevation <path>   # --apply to write; dry-run by default
```

The codemod is scoped to the `elevation` attribute only — `frame-shadow` carries the identical `none/sm/md/lg` values on the media surface and is left untouched.

Lumina's `dimensions/surfaces.css` is now rune-name-free: surface chrome is selected entirely by `[data-elevation]` / `[data-prominence]` rather than enumerated rune lists, so a new theme inherits the base defaults and overrides only the deltas.
