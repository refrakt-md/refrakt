---
'@refrakt-md/transform': patch
---

Fix the top-level `validation` config shorthand, which was declared everywhere
but read nowhere.

`validation` (SPEC-132) was declared on `RefraktConfig` as a deprecated
shorthand, described in the JSON Schema, and documented in the generated
configuration reference — but it was missing from `SITE_FIELDS`, the list that
actually makes a shorthand work. A project that configured validation the
documented way got editor autocomplete, schema shape-checking, no warning, and
no effect.

Adding it to `SITE_FIELDS` restores both directions the list drives: the
shorthand now folds into the site config at load, and `refrakt config migrate`
moves it into `site` along with the other flat-shape fields.

Note that the shorthands are the *flat shape* — they apply to a config with no
`site`/`sites` key, and are ignored wholesale beside one. That is true of
`sandbox`, `baseUrl` and every other entry, and is unchanged here.
