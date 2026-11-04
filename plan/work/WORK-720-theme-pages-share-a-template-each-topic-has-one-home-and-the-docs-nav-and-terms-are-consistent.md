{% work id="WORK-720" status="ready" priority="medium" complexity="moderate" source="SPEC-193" tags="docs, themes, nav, terminology" milestone="v0.49.0" %}

# Theme pages share a template, each topic has one home, and the docs nav and terms are consistent

SPEC-193 D8. The theme preset pages repeat four sections; configuration migration, tint and the
`metaFields` family are each explained in three places; the docs nav mixes advanced topics into
Authoring and leaves pages orphaned.

## Acceptance Criteria
- [ ] Each theme preset page follows one short template (pitch, opt-in snippet, palette, preview, attribution); "Composing with tideline" appears once, in `lumina.md`; `lumina.md` no longer repeats the catalog's table and counts its presets correctly
- [ ] The theme catalog's intro is written for someone choosing a theme
- [ ] Configuration migration lives in `migration.md`, tint in its three audiences' pages linking each other, `metaFields` and friends in `blocks-and-layout.md`; the other copies link instead of repeating
- [ ] Docs repeating a rune page (layout cascade, partial or include, rich menubar panels) link to it instead
- [ ] An Advanced group in the docs nav holds nav-slug-resolution, rich-menubar-panels, entities and entity-routes; theme tools move under extend; `extend/distributing/*` is in the nav or removed; the `contracts` link in `extend/index.md` is fixed
- [ ] One spelling throughout (`color`, `Internationalization`)

## Blocked by
- {% ref "WORK-718" /%}

## References
- {% ref "SPEC-193" /%}: D8, F5, F7.

{% /work %}
