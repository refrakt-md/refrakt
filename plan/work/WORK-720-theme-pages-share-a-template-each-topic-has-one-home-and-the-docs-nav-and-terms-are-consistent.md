{% work id="WORK-720" status="done" priority="medium" complexity="moderate" source="SPEC-193" tags="docs, themes, nav, terminology" milestone="v0.49.0" pr="refrakt-md/refrakt#793" %}

# Theme pages share a template, each topic has one home, and the docs nav and terms are consistent

SPEC-193 D8. The theme preset pages repeat four sections; configuration migration, tint and the
`metaFields` family are each explained in three places; the docs nav mixes advanced topics into
Authoring and leaves pages orphaned.

## Acceptance Criteria
- [x] Each theme preset page follows one short template (pitch, opt-in snippet, palette, preview, attribution); "Composing with tideline" appears once, in `lumina.md`; `lumina.md` no longer repeats the catalog's table and counts its presets correctly
- [x] The theme catalog's intro is written for someone choosing a theme
- [x] Configuration migration lives in `migration.md`, tint in its three audiences' pages linking each other, `metaFields` and friends in `blocks-and-layout.md`; the other copies link instead of repeating
- [x] Docs repeating a rune page (layout cascade, partial or include, rich menubar panels) link to it instead
- [x] An Advanced group in the docs nav holds nav-slug-resolution, rich-menubar-panels, entities and entity-routes; theme tools move under extend; `extend/distributing/*` is in the nav or removed; the `contracts` link in `extend/index.md` is fixed
- [x] One spelling throughout (`color`, `Internationalization`)

## Blocked by
- {% ref "WORK-718" /%}

## References
- {% ref "SPEC-193" /%}: D8, F5, F7.

## Resolution

Completed: 2026-11-10

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done
- Nav: Advanced docs group (entities, entity-routes, nav-slug-resolution, rich-menubar-panels); theme CLI commands moved into `extend/theme-authoring/tooling.md`, `refrakt validate` to `docs/cli/validate.md`, `docs/cli/theme-tools` redirects; `extend/distributing/*` in the extend nav; `refrakt contracts` link fixed.
- Theme presets: one template on all nine pages; shared material in `lumina.md` (nine presets, no repeated table); catalog intro rewritten for choosing a theme.
- One home per topic: config migration (`migration.md`), tint (concepts / rune / theme cascade, linking each other), metaFields family (`blocks-and-layout.md`); docs pages repeating layout, include and nav link to them.
- `color` and "Internationalization" throughout.

### Notes
- Corrected on the way: `config migrate` writes `site.plugins`; dark tint values are inline `--tint-dark-*`; `metaRank` no longer exists.
- `config-api.md`'s Hint example still uses the deprecated `structure` field.

{% /work %}
