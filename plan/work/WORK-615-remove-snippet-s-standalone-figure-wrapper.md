{% work id="WORK-615" status="done" priority="medium" complexity="simple" source="SPEC-141" milestone="v0.39.0" tags="runes,snippet,lumina,breaking" pr="refrakt-md/refrakt#667" %}

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

- [x] `wrapStandaloneSnippets` is removed; a standalone snippet renders as `<pre data-source>` with no `<figure>` wrapper
- [x] Lumina's `.rf-snippet` rules are removed, and the CSS coverage test passes
- [x] A changeset records the output change and names the replacement selector, `pre[data-source]`
- [x] `{% snippet %}` inside `{% codegroup %}` and `{% diff %}` is unchanged
- [x] `refrakt contracts --check` drift is limited to the wrapper removal, both committed copies regenerated
- [x] `npm run seo:baseline:check` reports no drift
- [x] Docs that show or mention the figure wrapper (snippet rune page, SPEC-062-derived content) are updated — `refrakt.stale` on the touched files names them

## References

- {% ref "SPEC-141" /%} — "Prerequisite: snippet must become single-phase", D5, D6
- {% ref "SPEC-062" /%} — the snippet rune and the wrapper's original rationale

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-tree-order-preprocess`
PR: refrakt-md/refrakt#667

### What was done
- `packages/runes/src/snippet-pipeline.ts`: removed `wrapStandaloneSnippets` / `walkAndWrap` / `wrapPreInFigure` and the fence-container allowlist (the module itself later went away in WORK-618).
- `packages/runes/src/config.ts`: postProcess no longer calls the wrap step; the `Snippet` theme entry is kept for inspect/contracts tooling, like `Data` and `Include`.
- `packages/lumina/styles/runes/snippet.css` deleted, import removed from `index.css`; `snippet` added to `UNSTYLED_BLOCKS` in the CSS coverage test.
- `packages/runes/src/file-ref-resolve.ts`: the file-ref preview drawer reused `figure.rf-snippet` for its body; without the CSS that figure would take the UA 40px inline margin, so the drawer body is now the same bare `<pre data-source data-lines>`. Test, `runes/file-ref.md` and a `drawer.css` comment updated.
- `site/content/runes/snippet.md`: new "Output" section — `pre[data-source]`, the removed wrapper, and composition with `{% codegroup %}` (figure not documented until BUG-028 lands).
- Changeset `snippet-renders-as-a-bare-pre.md` (breaking output change, names `pre[data-source]`).

### Notes
- Contracts: no drift on either copy. Because the `Snippet` config entry stays, the contract never described the figure, so there was nothing to regenerate. SEO baseline: no drift.
- Tests: the snippet-pipeline wrap tests are replaced by one that runs the full core postProcess and asserts a bare `<pre data-source data-lines>`. It and the updated file-ref drawer assertion both fail on the pre-change code (verified by stashing the src change).
- SPEC-062 still describes the wrapper; it is a shipped historical spec, superseded on this point by SPEC-141 D5, and was left as written.

{% /work %}
