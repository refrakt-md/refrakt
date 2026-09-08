---
'@refrakt-md/runes': minor
'@refrakt-md/transform': minor
'@refrakt-md/marketing': patch
'@refrakt-md/docs': patch
'@refrakt-md/storytelling': patch
'@refrakt-md/places': patch
'@refrakt-md/business': patch
'@refrakt-md/design': patch
'@refrakt-md/learning': patch
'@refrakt-md/media': patch
'@refrakt-md/plan': patch
---

Declare the schema↔engine join tables in tag modules (SPEC-125 Phase 2)

`sections`, `mediaSlots` and `frameTarget` are not theme configuration: their keys are `data-name`s a rune's own transform emits and their values are a closed engine vocabulary, so the theme owns neither side. All 72 declarations across core and the nine plugins now live in the tag module that owns each rune, with `ThemeConfig.runes` *referencing* the declaration rather than defining it:

```ts
// tags/card.ts
export const cardSections = { media: 'media', body: 'body' } as const;
export const card = createContentModelSchema({ sections: cardSections, … });

// config.ts — already imports from tags/
Card: { block: 'card', sections: cardSections, … }
```

This is what makes narrowing possible. `createContentModelSchema` now has the gating facts **at construction**, recorded on a new `schemaRuneStructures` WeakMap alongside the existing `schemaContentModels` — so a rune's Markdoc schema can later offer only the universal attributes that can affect it, with no config lookup and no import cycle. The direction matters: `config → tags` holds uniformly across the repo, and having tags import config instead would cycle in core, where `createContentModelSchema` runs at module scope and would observe `coreConfig` uninitialised.

**Pure relocation.** No values changed, the engine's read path is untouched (it still reads `config.sections`, `config.mediaSlots`, `config.frameTarget`), transform output is byte-identical, and `refrakt contracts --check` passes with no regeneration.

`IDENTITY_FIELDS` gains `mediaSlots` and `frameTarget`, closing the gap the identity guard deliberately left. `frameTarget` in particular needs it: frame applicability resolves as `config.frameTarget ?? (hasMediaSection(config.sections) ? 'media' : null)` and the type has no `'none'`, so it can only ever *grant* — an unguarded theme could add `frameTarget: 'self'` to a rune whose schema rejects `frame=`, config granting what the schema forbids.

New public API on `@refrakt-md/runes`: `schemaRuneStructures`, plus the `RuneStructure` and `SectionRole` types. `createContentModelSchema` accepts `sections`, `mediaSlots` and `frameTarget`; all three are optional and nothing reads them yet.
