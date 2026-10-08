---
'@refrakt-md/transform': minor
---

The identity guard is path-granular (SPEC-158). `IDENTITY_FIELDS` now holds config paths, and `findReservedFields` resolves a wildcard segment. Three protections join the existing eight keys, each dropped and reported rather than thrown:

- A theme override of `sequence` is ignored — whether an ordinal is information (a playlist's track numbers) is rune identity. `sequenceDirection` stays overridable.
- A theme override of `metaFields.<field>.metaType` is ignored while that entry's `label`, `sentimentMap` and `transform` still merge; an override entry that leaves `metaType` out keeps the declared one.
- A `layout` wrapper's `attrs` may not set an attribute an identity field emits (`data-section`, `data-media`, `typeof`, `property`, `data-sequence`, `data-meta-type`, or `data-{name}` for a declared modifier). The attribute is dropped at config assembly and the wrapper's other attributes stand; `validateThemeConfig` reports it as an error. `data-zone-layout` and other presentation attributes are unaffected.

`mergeRuneConfig`, `derivedAttributeOwner`, `IDENTITY_FIELD_ATTRIBUTES` and `derivedAttributeMessage` are now exported. Nothing in the shipped plugins or Lumina is affected.
