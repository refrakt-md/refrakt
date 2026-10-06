{% work id="WORK-599" status="done" priority="high" complexity="simple" milestone="v0.38.0" source="SPEC-140" tags="runes,transform,dead-code,breaking" pr="refrakt-md/refrakt#656" %}

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

- [x] `schema`, `typeof` and `schemaOrgType` are gone from `TransformResult` and `InlineTransformResult`
- [x] `createComponentRenderable` has no `schemaTags`, `isSeoMeta` or `emptySeoMetas` branch
- [x] `defineRune({ schemaOrgType })` and `props.ts`'s `schemaOrgType` fields are removed or shown to have a live consumer
- [x] A changeset records this as a breaking change to a published type
- [x] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [x] `npm test` passes unchanged

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

## Resolution

Completed: 2026-10-06

Branch: `claude/v0-37-post-release-plan-dc3va1`

### What was done
- `packages/runes/src/lib/component.ts`: removed `schema`/`typeof` from `TransformResult`, `schemaOrgType` from `InlineTransformResult`, and the `schemaTags` / `isSeoMeta` / `emptySeoMetas` branches. Every property tag now gets `data-field`; the data-meta filter is unconditional. `stripSchemaOrg`'s doc comment now names the schema-table applier as the stamper.
- `packages/runes/src/props.ts`: removed `schemaOrgType` from `AccordionProps` / `AccordionItemProps` — no rune maps a property by that name, so no component ever received it. (`defineRune` has no `schemaOrgType` field; nothing to remove there.)
- `site/content/extend/rune-authoring/output-contract.md`: dropped the `schema` and `schemaOrgType`/`typeof` parameter rows and the "sets property=" step; points to the plugin guide's schema-table section.
- `.changeset/schema-channel-removed.md`: minor, **Breaking:** (the repo's 0.x convention).

### Notes
- Root attribute order moves: `typeof` now follows `class` on runes with a schema row, because the root no longer reserves an empty `typeof` key for the applier to fill in place. Values unchanged; contracts and the SEO baseline are order-insensitive. Chose this over keeping a dead `typeof: undefined` placeholder.
- `imperative-schema-migration.test.ts` still guards the text form; it is now redundant with the type but harmless, and catches an `as any` reintroduction the type cannot.

{% /work %}
