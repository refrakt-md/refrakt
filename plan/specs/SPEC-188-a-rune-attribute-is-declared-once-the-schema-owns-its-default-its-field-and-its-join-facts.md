{% spec id="SPEC-188" status="draft" tags="runes, simplification, schema, config, composition, docs" %}

# A rune attribute is declared once: the schema owns its default, its field and its join facts

A TS rune's attribute is written down once: on the schema. Its default, whether it becomes a field
(a meta in `data-rune-fields`), and whether that field becomes a BEM modifier are all properties of
the attribute. `createContentModelSchema` emits the metas, theme assembly derives the engine's
`modifiers` from them, and the reference docs read the default from the same place. This is the
shape compositions already have: a composition's attribute frontmatter carries `default` and the
engine config is derived. TS runes catch up, so the two kinds of rune stop differing in how they
are declared as well as in how they are written.

## Why

**The same fact is written in three or four places, and they drift.** Take `hint`'s `type`:

- the schema declares the attribute (`matches`, `description`), but has no field for its default;
- the transform writes the default by hand: `new Tag('meta', { content: attrs.type ?? 'note' })`
  (`packages/runes/src/tags/hint.ts:29`);
- the engine config writes it again: `modifiers: { hintType: { source: 'meta', default: 'note' } }`
  (`packages/runes/src/config.ts:386`);
- the reference docs cannot show it: none of the 514 rows in `site/content/_data/rune-attributes.json`
  carries a default, because the schema doesn't have one to give.

A grep for `content: attrs.x ?? '…'` finds 54 such hand-written defaults in core and plugin tags;
of the 75 distinct defaults in engine configs, about 55 also appear as a literal in a transform.
The `fieldMetas()` helper that removes some of this has 11 call sites.

**The clearest case already uses the declarative path.** `plugins/plan/src/tags/bug.ts` lists its
fields in `emits.properties` (with `status: 'reported'`), again in `attributes`, and a third time in
`plugins/plan/src/config.ts` (with `default: 'reported'`). {% ref "SPEC-143" /%} made the
transform declarative and left the other two copies standing.

**Join facts are copied from schema to config, and tests hold the copies together.** `sections`,
`provides`, `mediaSlots` and `frameTarget` are declared on the schema and then imported and
restated in config: about 55 `sections: xSections` entries, 28 `provides`, ~45 import lines.
`packages/lumina/test/join-tables.test.ts` and `prose-capability.test.ts` exist to keep them equal.
A copy that a test must hold equal is a copy that should not exist.

**Catalog metadata has the same problem.** `defineRune` in `packages/runes/src/index.ts` repeats
the object key as `name:` in all 62 entries and spells out `typeName:` in 58 that could derive it
(as `composedTypeName()` already does). `category` and `description` live in `defineRune`, in the
reference page frontmatter and in `runes/_layout.md`: 14 core runes disagree on category, and only
3 of 53 descriptions match. `scripts/backfill-rune-metadata.mjs` exists because of that.
Compositions went the other way and dropped fields: `DEFINITION_KEYS` (`composition.ts:1716`) has
no `category` and no `snippet`, so `hero` lost both when it was converted.

**Every conversion to a composition is cheaper when the TS side is already declared.** A rune
whose facts are all on the schema is mostly a transcription into frontmatter; a rune whose facts
are spread over a transform, a config entry and a catalog entry has to be reverse-engineered.

## Decisions

### D1 — `SchemaAttribute` gains `default` and `field`

```ts
attributes: {
  type: { type: String, matches: ['note', 'warning', 'caution', 'check'],
          default: 'note', field: true },
  layout: { type: String, field: { bem: false } },
}
```

- `default` is the value used when the author omits the attribute. It is what the docs show.
- `field: true` emits a meta for the attribute (resolved value, default applied) into the field
  bag, exactly as a hand-written `new Tag('meta', …)` does today. `field: { bem: false }` emits the
  field and data attribute without a BEM modifier class (today's `noBemClass`). A `field` may give
  a different field name (`field: { name: 'hintType' }`) so existing field names and contracts do
  not change.
- `createContentModelSchema` emits the declared fields before calling `transform`, so a transform
  no longer builds them. A transform may still emit a field the schema does not declare (derived
  values, such as `pricing`'s parsed price); those stay hand-written.

### D2 — engine `modifiers` derive from declared fields

During theme assembly, each declared field contributes `{ source: 'meta', default, noBemClass }`
to its rune's `modifiers`. A config entry keeps only what the schema cannot say: `valueMap`,
`styles`, `contextModifiers`, `structure`. Config that restates a derived modifier is reported by
`refrakt theme validate`, so the copies cannot return.

The structure contract is the gate: `refrakt contracts --check` must pass unchanged for every rune
as it moves. A rune whose contract changes is not a candidate for this mechanical step.

### D3 — join facts are read from the schema, not restated

`sections`, `provides`, `mediaSlots` and `frameTarget` are merged from the schema's side table
when the theme config is assembled. A config entry no longer imports or repeats them. Once that
holds, `join-tables.test.ts` and `prose-capability.test.ts` have nothing to compare and are
deleted.

### D4 — the simple-transform runes move to `emits`

`emits` ({% ref "SPEC-143" /%}) covers "metas plus region slots plus attribute value slots".
About 15–20 runes have a hand-written transform of exactly that shape: the
`renderNodes → wrap('div') → refs.body → createComponentRenderable` idiom (`wrap('div')` appears 55
times in 41 files). Candidates: `hint`, `sidenote`, `textblock`, `details`, docs `api`,
storytelling `lore`. Each moves with the {% ref "SPEC-143" /%} D7 gate (byte-identical output) and
is a separate work item. Runes that are about to become compositions skip this step.

### D5 — one source for catalog metadata

- `name` is the catalog key; `typeName` is derived. Neither is written by hand.
- `category`, `description` and `snippet` live in one place: the catalog entry for a TS rune, the
  definition frontmatter for a composition. Reference page frontmatter and `runes/_layout.md` read
  them, via the generated data {% ref "SPEC-187" /%} already introduces, instead of restating them.
- `DEFINITION_KEYS` gains `category` and `snippet`, and `hero` gets back what it lost.
- A snippet that lists an attribute's values (`${1|a,b,c|}`) is generated from `matches`.
- `scripts/backfill-rune-metadata.mjs` is deleted once nothing restates category.

### D6 — the split-layout preset carries its config fragment

The four `media-position`/`media-ratio`/`valign`/`collapse` modifiers and the `--split-valign`
style are copied into 8 configs. `registerAttributePreset` (`tags/common.ts:38`) carries the
config fragment along with the attributes, so a rune that uses the preset gets both. Its 9
hand-written docs tables are replaced by the generated attribute table ({% ref "SPEC-128" /%}).
Attributes documented only in prose (e.g. `pricing`'s `tier` attributes) get their `description`
moved onto the schema.

## Not in scope

- **Converting runes to compositions.** That has its own specs per plugin; this spec makes the
  TS side declarative for as long as it exists.
- **Plan's config deduplication** beyond what D1–D3 give for free. {% ref "SPEC-152" /%} D1 owns it.
- **Changing any emitted output.** Every step here is gated on unchanged contracts and baselines.

## Open questions

- Should `field` default to `true` for every attribute with `matches`? Most enum attributes
  become fields, but some are inputs only (a heading level, a source path). An explicit opt-in is
  safer to start with.
- Do composition and TS attribute declarations share one type? They should, but the composition
  side is parsed from YAML and validated separately today.

## Acceptance Criteria

- [ ] `SchemaAttribute` accepts `default` and `field`, and `createContentModelSchema` emits declared fields
- [ ] Theme assembly derives `modifiers` from declared fields; `refrakt theme validate` reports a restated one
- [ ] Core runes declare their defaults on the schema, with `refrakt contracts --check` unchanged
- [ ] Plugin runes that remain TS declare their defaults on the schema, with contracts unchanged
- [ ] `sections`, `provides`, `mediaSlots` and `frameTarget` are no longer restated in any config, and `join-tables.test.ts` and `prose-capability.test.ts` are deleted
- [ ] The generated attribute data carries each attribute's default, and reference pages show it
- [ ] Catalog entries no longer write `name` or `typeName`; `category` and `description` have one source each
- [ ] `DEFINITION_KEYS` accepts `category` and `snippet`, and `hero` declares both
- [ ] `scripts/backfill-rune-metadata.mjs` is deleted
- [ ] The split-layout preset supplies its config fragment, and the 8 copied blocks are removed

## References

- {% ref "SPEC-143" /%}: `emits`, the declarative transform this extends to defaults and config.
- {% ref "SPEC-128" /%}: generated attribute tables, which gain a default column.
- {% ref "SPEC-187" /%}: generated rune intros, the consumer of single-source catalog metadata.
- {% ref "SPEC-153" /%}: D9, a composition does not restate its name.
- {% ref "SPEC-168" /%}: attribute presets for compositions.
- {% ref "SPEC-152" /%}: plan's config deduplication.

{% /spec %}
