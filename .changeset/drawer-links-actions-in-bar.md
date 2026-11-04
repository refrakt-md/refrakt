---
'@refrakt-md/runes': minor
'@refrakt-md/lumina': minor
'@refrakt-md/skeleton': minor
---

**A link to a drawer opens it** (SPEC-187 D10). Any link whose target is a drawer on the same page — `[Install](#install)`, `{% link href="#install" %}`, an `actions` item — becomes a drawer trigger, as `{% ref %}` already was. The target may be the drawer's `id` or its `#drawer-<id>` anchor; a drawer wins over a heading with the same id; a link to an id no drawer has is unchanged. A trigger's text can now carry an `{% icon %}`.

**Actions in a bar** (SPEC-187 D11). `actions` inside a `bar` gets the `rf-actions--in-bar` context modifier. Lumina renders it compact, at a badge's height, and tonal rather than filled, a primary included; the skeleton keeps it a row on a phone.

**A bar's paragraphs take no block margin** in Lumina, so a group written as a paragraph lines up with the group beside it.
