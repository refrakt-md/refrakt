{% work id="WORK-615" status="in-progress" priority="medium" complexity="simple" source="SPEC-141" milestone="v0.39.0" tags="runes,snippet,lumina,breaking" %}

# Remove snippet's standalone figure wrapper

{% ref "SPEC-141" /%} D5/D6, shipped first and on its own. `snippet` runs in two
phases: preprocess, and a `postProcess` pass, `wrapStandaloneSnippets` in
`packages/runes/src/config.ts`, which wraps a standalone `<pre>` in
`<figure class="rf-snippet">`. The wrapper adds no information: `data-source` and
`data-lines` are already on the `<pre>`, and `.rf-snippet`'s CSS only resets the
margins the figure itself introduced.

Removing it makes `snippet` single-phase, so {% ref "WORK-618" /%} moves one
concern into the tag module rather than half of one.

**Breaking output change.** Downstream CSS or tooling selecting `.rf-snippet` or
`[data-source-path]` must move to `pre[data-source]`. Authors who want chrome
compose it: `{% codegroup title="…" %}`, or `{% figure %}` once
{% ref "BUG-028" /%} lands in this milestone.

## Acceptance Criteria

- [ ] `wrapStandaloneSnippets` is removed; a standalone snippet renders as `<pre data-source>` with no `<figure>` wrapper
- [ ] Lumina's `.rf-snippet` rules are removed, and the CSS coverage test passes
- [ ] A changeset records the output change and names the replacement selector, `pre[data-source]`
- [ ] `{% snippet %}` inside `{% codegroup %}` and `{% diff %}` is unchanged
- [ ] `refrakt contracts --check` drift is limited to the wrapper removal, both committed copies regenerated
- [ ] `npm run seo:baseline:check` reports no drift
- [ ] Docs that show or mention the figure wrapper (snippet rune page, SPEC-062-derived content) are updated — `refrakt.stale` on the touched files names them

## References

- {% ref "SPEC-141" /%} — "Prerequisite: snippet must become single-phase", D5, D6
- {% ref "SPEC-062" /%} — the snippet rune and the wrapper's original rationale

{% /work %}
