{% work id="WORK-633" status="in-progress" priority="high" complexity="complex" source="SPEC-153" milestone="v0.41.0" tags="composition,plugins,packaging,loader" %}

# A plugin ships composed runes from a declared rune directory

{% ref "SPEC-153" /%} implementation note 3, the plugin side. In v0.40.0 a composed definition
reached the pipeline only as a string passed to `defineComposedRune`. A plugin now declares
`runeDir` (package-relative, resolved the way `fileRoots` resolves, D2). Every `<rune>.md` in
it is loaded as a composed rune.

Decisions:

- **D1.** One file format and one in-memory shape. Nothing downstream can tell a plugin rune
  from a project rune.
- **D9.** The filename is the rune's name. A frontmatter `rune:` key restating it is rejected.
  Fixtures stay in a sibling `fixtures/` directory.
- **D3.** A read failure throws with the resolved path and the cause. It never degrades to
  zero runes.
- **D6.** `refrakt plugin validate` checks that the directory is covered by `files` and that
  the package resolves. The proof is the `npm pack` → install → load harness from
  {% ref "WORK-627" /%}, not a monorepo test.

## Choosing the consumer

SPEC-153 names `@refrakt-md/plan` as the first consumer. Pick a plan rune whose composed form
reproduces its output, or whose differences can be explained, and record the choice. If no
plan rune fits without changing published output, ship the proof through a fixture plugin
that the harness packs, and record why plan was not used. Do not add a rune only to have
something to ship.

## Acceptance Criteria

- [ ] A composed rune file loads identically from a project directory and from a plugin's declared rune directory, asserted by loading the same file both ways and comparing the resulting `Rune` (D1)
- [ ] A plugin's composed rune survives `npm pack` → install → load in a fixture project outside the workspace, asserted with the WORK-627 harness; the plugin used, and why, is recorded
- [ ] A plugin whose declared rune directory is missing from `files`, or whose package is unresolvable, fails `refrakt plugin validate` with the resolved path and the cause (D6)
- [ ] A plugin rune read failure throws rather than yielding an empty set, asserted by a fixture plugin with a blocked `./package.json` export (D3)
- [ ] A composed rune is named `<rune>.md`, its name is read from the filename, and a frontmatter key restating it is rejected rather than silently preferred (D9)
- [ ] A rune in `runeDir` and a code-defined `PluginRune` with the same name in one plugin is rejected, naming both
- [ ] `refrakt inspect`, `refrakt reference` and `refrakt contracts` show a directory-loaded rune exactly as they show a code-defined composed one
- [ ] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy, unless the chosen plan rune moves them, in which case every difference is reviewed and explained

{% /work %}
