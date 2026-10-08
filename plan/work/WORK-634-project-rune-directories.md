{% work id="WORK-634" status="in-progress" priority="high" complexity="complex" source="SPEC-153" milestone="v0.41.0" tags="composition,project,loader,hosted,dx" %}

# A project defines its own composed runes in `runes.dir`

{% ref "SPEC-153" /%} implementation note 4, the project side, and the step that opens composition
to users. A project declares `runes.dir` in `refrakt.config.json`, following `contentDir`'s
shape, with a recommended default of `runes` (D4). The loader discovers every `<rune>.md` in it.

Decisions:

- **D5.** Project runes are read through `ProjectFiles`. They must work under
  `memoryProjectFiles` with no filesystem, and a path escaping the project root is refused by
  the provider.
- **D8.** Precedence is core < plugin < project. A project rune may not take a core rune's
  name. Shadowing a plugin rune requires a `runes.prefer` entry.
- **D7.** `runes.local` keeps its scope: it takes a JS module, and a definition passed to it
  is rejected with a pointer to `runes.dir`.
- **D10.** Editing a definition in dev invalidates every page that uses the rune, not only the
  edited file.
- **SPEC-145 D25 item 2.** A project definition that declares `schema` is rejected at load,
  naming the rune and D25. This loader is where that ban is enforced.

## Blocked by

- {% ref "WORK-633" /%}

## Acceptance Criteria

- [ ] Project runes resolve under `memoryProjectFiles` with no filesystem, and a rune path escaping the project root is refused by the provider rather than by the loader (D5)
- [ ] A project rune taking a core rune's name is rejected at load with both names reported; taking a plugin rune's name requires a `runes.prefer` entry (D8)
- [ ] Editing a file in the project's rune directory in dev invalidates every page using that rune, asserted on a two-page fixture where only one page uses it (D10)
- [ ] A project definition declaring `schema` is rejected at load, naming the rune and SPEC-145 D25; the same definition shipped in a plugin's `runeDir` is accepted
- [ ] A composed definition passed through `runes.local` is rejected with a message pointing at `runes.dir` (D7)
- [ ] `create-refrakt` scaffolds the `runes.dir` key, and a scaffolded project with one definition in `runes/` builds and renders it
- [ ] `refrakt validate` reports a project definition's construction errors with the definition's file and line, as structured findings

{% /work %}
