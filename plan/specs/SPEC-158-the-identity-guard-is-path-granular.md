{% spec id="SPEC-158" status="accepted" tags="theme, config, identity, correctness, architecture" %}

# The identity guard is path-granular

## Summary

Refining the composition corpus surfaced four cross-document tensions. **Three of them are
one question**: {% ref "ADR-028" /%}'s identity guard is *key*-granular, and two of the things
that need protecting are not keys. The fourth is a hole in the same guard, measured rather
than argued.

{% ref "ADR-030" /%} predicted this in its own Consequences and left it open:

> **Semantic locking needs somewhere to live.** Rule 3 requires the engine to distinguish
> rune-owned from theme-owned modifiers on the same arrangement… Modifiers need the same
> treatment, and the two should use one mechanism.

This is that mechanism. It is deliberately small and it is a **prerequisite rather than a
feature**: both tightenings are inert against today's corpus, measured below, so they can land
before anything that depends on them.

## The guard as it stands

`mergeRuneConfig` calls `findReservedFields(override, IDENTITY_FIELDS)`
(`packages/transform/src/merge.ts:180`), and the test is key **presence**. The reason is
recorded on the function itself:

> Presence is what counts — an explicit `sections: undefined` still shadows the base under a
> spread merge, so `in` is the right test.

`IDENTITY_FIELDS` is eight top-level keys: `block`, `modifiers`, `sections`, `mediaSlots`,
`frameTarget`, `universalAttributes`, `provides`, `schema`. A violation is **dropped and
reported**, not thrown.

And the reach already exists for merging but not for guarding: `merge.ts` walks into
`override.blocks` (`:145`) and `override.variants` (`:163`) to merge them per-entry. So the
machinery to address a path is present; only the guard is flat.

## The three cases

### 1. `sequence` is a whole key, and it is simply missing

`RuneConfig.sequence` is `'numbered' | 'connected' | 'plain'`
(`packages/transform/src/types.ts:456`) and is not in `IDENTITY_FIELDS`. So a theme override
can flip a rune from `numbered` to `connected` today.

That is {% ref "ADR-030" /%} rule 3's founding example, and its reasoning is the clearest
statement of the principle anywhere in the corpus:

> On a playlist the number *is* the track number, an identifier a listener says out loud.
> Restyling a playlist as a timeline does not change how it looks. **It deletes the track
> numbers.**
>
> So `numbered` vs `connected` is not an appearance cut. It encodes **"is the ordinal itself
> information?"** — a fact about the content, not about the theme.

`sequenceDirection` is the opposite and stays presentational: rule 3 assigns *"spacing, and
responsive direction collapse"* to the theme explicitly.

### 2. `metaFields[*].metaType` is a sub-key

`metaType` does two jobs. It selects render shape — chip for `status` / `category` / `tag`,
bare for `id` / `quantity` / `temporal` / `code` — and its own interface comment describes the
manifest as *"the field's domain semantics (type, sentiment, label)"*.

The first job is the theme's. The second is not: a theme retyping `status` from `status` to
`category` is not restyling a field, it is changing what the author declared their data to
mean. {% ref "SPEC-152" /%} D4 is where this stops being theoretical — a composed plan
entity's *entire* differentiation from its four siblings is its `metaFields` and `blocks`
manifest, because the layout is byte-identical five ways.

So the field splits, and **the precedent for splitting within a concern is established
twice**: `sections` is identity while `blocks` and `layout` are presentation
({% ref "SPEC-080" /%} / {% ref "SPEC-081" /%}), and rule 3 splits the marker from the
marker's chrome. `label` is presentational and additionally i18n-keyed
({% ref "SPEC-035" /%}); `sentimentMap` and `transform` are presentational.

### 3. `layout.attrs` can write what an identity field derives

`LayoutEntry.attrs` is spread onto a created wrapper unconditionally at
`packages/transform/src/engine.ts:1532`:

```ts
out.push(makeTag(entry.tag, { 'data-name': name, ...(entry.attrs ?? {}) }, kids));
```

Nothing validates it — not at config normalisation, not at `refrakt plugin validate`.
{% ref "SPEC-156" /%} measured the arrangement case (`data-zone-layout` lands and takes
effect). The problem is the general one: `layout` is presentation and correctly
theme-overridable, and an arbitrary attribute map inside it goes around every guard that works
by owning a field's *source*. `data-section` comes from `sections`; `typeof` and `property`
come from `schema`; both keys are guarded and neither attribute is.

## Both tightenings are inert today

Measured, because a prophylactic that breaks the reference theme is not cheap:

- `packages/lumina/src/config.ts` is 106 lines and contains **no** `sequence`, `metaFields` or
  `metaType` entry. The reference theme overrides none of them.
- The five plugin configs that mention `sequence` (`places`, `business`, `media`, `marketing`,
  `learning`) declare it for **their own** runes, which is the base rather than an override.

So this lands as a no-op against the current corpus and starts paying only when a theme or a
composed rune tries what the audits identified.

## Decisions

### D1 — the guard is path-granular, not key-granular

`IDENTITY_FIELDS` becomes a list of config **paths** — a bare key where a whole key is
protected, and a path with a wildcard segment where a sub-field is (`metaFields.*.metaType`).
`findReservedFields` resolves a path rather than testing `in`. The presence semantics that
motivated `in` are preserved per segment: an explicit `undefined` at a protected path is still
a violation, because it still shadows the base under a spread merge.

### D2 — `sequence` is identity; `sequenceDirection` is not

Rule 3, applied. One encodes whether the ordinal is information; the other is responsive
collapse, which rule 3 hands the theme in as many words.

### D3 — `metaFields.*.metaType` is identity; `label`, `sentimentMap` and `transform` are not

The same split `sections` / `blocks` already draws, one level down. A theme restyles how a
field is presented and may not restate what kind of field it is.

### D4 — an `attrs` map may not set an attribute that an identity field derives

Stated by inversion rather than as a deny-list, so it cannot drift: each identity field has a
known set of emitted attributes, and those are refused in `attrs`. Enumerating attribute names
instead would go stale the first time a field gains an output.

`data-zone-layout` is **not** refused. {% ref "SPEC-156" /%} D5 legitimises the arrangement
use, and an arrangement is presentation — the point is that it becomes a declaration rather
than staying an attribute-map side effect.

### D5 — a violation is dropped and reported, never thrown

Unchanged from today's behaviour, and extended to the new granularity: a guarded sub-field is
dropped while the rest of its entry merges, and a refused attribute is dropped while the rest
of the wrapper stands. A theme should not be able to fail a build, and a partially-applied
override that reports itself is more useful than an abort.

### D6 — this closes {% ref "ADR-030" /%}'s open "semantic locking needs somewhere to live"

Recorded so the arrangement work does not reopen it. One mechanism serves both the arrangement
modifiers rule 3 describes and the metadata manifest {% ref "SPEC-152" /%} D4 needs, which is
what that consequence asked for.

### D7 — this ships before the work that depends on it

It is inert against the current corpus (measured above), it unblocks
{% ref "ADR-030" /%} and {% ref "SPEC-152" /%} D4, and it is the only item among the four
tensions that is purely a tightening. Sequencing it first means the specs that cite these
rules stop citing something the code does not enforce.

## Non-goals

- Changing what a theme may override beyond the three cases above; this is a granularity
  change, not a re-litigation of {% ref "ADR-028" /%}
- The `postProcess` declarability question — a different axis, resolved in
  {% ref "SPEC-144" /%} D2
- Specifying the arrangement vocabulary or its declaration ({% ref "SPEC-156" /%})
- Adding validation to `refrakt plugin validate` beyond the `attrs` refusal
- Revisiting drop-and-report in favour of throwing (D5)

## Acceptance Criteria

- [ ] `IDENTITY_FIELDS` holds paths, and `findReservedFields` resolves a wildcard segment, with the existing eight keys behaving exactly as before — asserted by the current tests passing unchanged
- [ ] A theme override setting `sequence` is dropped and reported, with the rune and field named, and a test cites {% ref "ADR-030" /%} rule 3 as the reason so the history is not lost
- [ ] `sequenceDirection` remains overridable, asserted alongside, so the split is visible in one place
- [ ] A theme override setting `metaFields.status.metaType` is dropped while that field's `label` and `sentimentMap` merge normally, asserted on one override carrying all three
- [ ] An `attrs` map setting `data-section`, `typeof` or `property` is refused with the path and attribute named; the wrapper's other attributes still apply
- [ ] `attrs` setting `data-zone-layout` is *not* refused (D4)
- [ ] The refusal is enforced at config normalisation, so it fires once per config rather than per render
- [ ] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy — the change is inert against the current corpus, and a diff means it is not
- [ ] `packages/lumina` merges unchanged, asserted rather than assumed, since the inertness claim rests on it
- [ ] The theme-authoring guide states which paths are guarded and why, with the track-number example as the case that makes it concrete

## References

- {% ref "ADR-028" /%} — a theme restructures a rune, never redefines it; the rule whose enforcement this sharpens
- {% ref "ADR-030" /%} — arrangements; rule 3's semantic locking, its founding example, and the open consequence D6 closes
- {% ref "SPEC-152" /%} — the plan audit; D4 is where `metaFields`' identity status stops being theoretical
- {% ref "SPEC-143" /%} — where the `metaFields` question was first recorded as open
- {% ref "SPEC-156" /%} — the ladder and row arrangements; measured the `attrs` hole and legitimises its arrangement use
- {% ref "SPEC-080" /%} — `metaFields` / `blocks`; the manifest whose sub-field D3 splits
- {% ref "SPEC-081" /%} — `layout` projection and the `{ tag, children, attrs }` creating form
- {% ref "SPEC-035" /%} — i18n keying, which is why `label` is presentational

{% /spec %}
