---
'@refrakt-md/transform': minor
'@refrakt-md/cli': patch
'@refrakt-md/runes': minor
'@refrakt-md/marketing': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
---

The eyebrow is a section role (WORK-656). Every rune with an eyebrow (`hero`, `cta`, `section`, `card`, `feature`, `pricing`, `reveal`, `tabs`, `accordion`, `steps`) now stamps `data-section="eyebrow"` on it.

- **The eyebrow's type and its linked pill are styled once**, by `[data-section="eyebrow"]` in the sections dimension: the stretched link in the skeleton, the pill in Lumina. The copies in nine runes, two packages each, are gone. A rune keeps only its own spacing, and `card` keeps a one-step-smaller size.
- **A linked eyebrow in `card` now renders as a pill**, as it already did in the other nine.
- `eyebrow` joins the section-role vocabulary (`RuneConfig.sections`). It does not count as a header role, so it does not offer `prominence` on its own.
