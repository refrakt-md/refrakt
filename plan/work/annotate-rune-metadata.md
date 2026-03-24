{% work id="WORK-060" status="ready" priority="high" complexity="moderate" tags="runes, transform, metadata" milestone="v0.9.0" %}

# Annotate Rune Configs with Metadata Dimensions

> Ref: SPEC-024 (Metadata System — Rune Config Examples, Rune Metadata Map)

Depends on: WORK-059 (Metadata Dimensions on StructureEntry)

## Summary

Once the identity transform supports metadata dimensions (WORK-059), annotate all existing rune configs across core and community packages with `metaType`, `metaRank`, and `sentimentMap` values. The full mapping is documented in SPEC-024's Rune Metadata Map table covering ~48 fields across all packages.

## Acceptance Criteria

- [ ] Core rune configs annotated: Budget (currency, travelers, duration)
- [ ] Docs package configs annotated: Api (method, path, auth), Symbol (kind, lang, since, deprecated)
- [ ] Learning package configs annotated: HowTo (estimatedTime, difficulty), Recipe (prepTime, cookTime, servings, difficulty)
- [ ] Storytelling package configs annotated: Character (role, status), Realm (realmType, scale), Lore (category), Faction (factionType, alignment, size), Plot (plotType, structure), Bond (bondType, status)
- [ ] Places package configs annotated: Event (date, endDate, location)
- [ ] Media package configs annotated: Playlist (type)
- [ ] Plan package configs annotated: Spec, Work, Bug, Decision, Milestone (all fields per SPEC-024 map)
- [ ] `refrakt inspect` output for each annotated rune shows correct `data-meta-*` attributes
- [ ] CSS coverage tests still pass (metadata attributes are additive, no BEM changes)

## Approach

Work through SPEC-024's Rune Metadata Map table package by package. For each field, add `metaType`, `metaRank`, and optionally `sentimentMap` to the corresponding structure entry child in the rune's config. Verify with `refrakt inspect <rune>` after each package.

## References

- SPEC-024 (Metadata System — Rune Metadata Map)
- WORK-059 (Metadata Dimensions on StructureEntry)

{% /work %}
