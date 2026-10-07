---
'@refrakt-md/runes': minor
'@refrakt-md/plan': patch
'@refrakt-md/cli': minor
---

A rune can declare its output slots instead of writing a transform (WORK-614, WORK-616)

`createContentModelSchema` takes an `emits` declaration as the alternative to
`transform`: the renderable's identity (`rune`, `tag`, `property`), its property
metas in `fieldMetas`' data form, and its named content `slots`, each a `value`
or a `region` read from one resolved field or attribute. The schema builds the
transform from it once, at construction, and calls it where it would call a
hand-written one, so the output is the same either way. The declaration is
plain data: functions, nesting, ordering and containers are rejected when the
schema is built, as are a slot that would put one `data-name` on two nodes and a
rune that declares both `transform` and `emits`, or neither. The rune's
`sections` join table is derived from its slots.

`work`, `bug` and `decision` in `@refrakt-md/plan` now use it. Their rendered
output is unchanged.

`refrakt inspect` and `refrakt reference` list a declared rune's slots, with
every default spelled out (`slots` and `emits` in JSON output).
