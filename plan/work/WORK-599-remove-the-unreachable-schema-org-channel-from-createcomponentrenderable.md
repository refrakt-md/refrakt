{% work id="WORK-599" status="ready" priority="high" complexity="simple" milestone="v0.38.0" source="SPEC-140" tags="runes,transform,dead-code,breaking" %}

# Remove the unreachable schema.org channel from `createComponentRenderable`

`schema`, `typeof` and `schemaOrgType` on `TransformResult` /
`InlineTransformResult` have **zero callers** across all 121 runes.
{% ref "SPEC-130" /%} moved every rune to the declarative table on
`createContentModelSchema({ schema })`; the imperative surface it replaced was
never deleted.

So `schemaTags` (`component.ts:57-61`) is always empty, `isSeoMeta`
(`:84`) is always `false`, `emptySeoMetas` (`:110-125`) is always empty, and
roughly 40 lines of the helper are unreachable.

## Acceptance Criteria

- [ ] `schema`, `typeof` and `schemaOrgType` are gone from `TransformResult` and `InlineTransformResult`
- [ ] `createComponentRenderable` has no `schemaTags`, `isSeoMeta` or `emptySeoMetas` branch
- [ ] `defineRune({ schemaOrgType })` and `props.ts`'s `schemaOrgType` fields are removed or shown to have a live consumer
- [ ] A changeset records this as a breaking change to a published type
- [ ] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [ ] `npm test` passes unchanged

## Approach

Verify the zero-caller claim before deleting, since it is the whole basis:
no `createComponentRenderable` call passes a `schema` key (every `schema:` in
the tag files is the *content model* option), and `schemaOrgType` appears in
`packages/runes/src/props.ts` and `lib/component.ts` only.

`SPEC-130`'s own acceptance criteria required "the imperative form either still
works or is fully migrated — not half of each, per rune". Per rune it is fully
migrated; this removes what remains.

**Why remove rather than keep for plugin authors.** These are exported types, so
a third-party plugin could use them — but they no longer do what their doc
comments claim, because the appliers and the JSON-LD harvest read the
declarative table instead. A surface that silently produces no structured data
is worse than none: the failure is invisible, which is the exact hazard
{% ref "SPEC-130" /%} D5 identified for this channel.

## Blocked by

- {% ref "WORK-598" /%} — with the metas already out of the children, the `pureDataMetas` filter has less to do and the removal reads more clearly

## References

- {% ref "SPEC-140" /%} — Tier 1, D4
- {% ref "SPEC-130" /%} — declarative schema.org mapping; why this has no callers

{% /work %}
