{% work id="WORK-658" status="done" priority="medium" complexity="simple" source="SPEC-170" tags="site, content, formatting, markdoc" milestone="v0.42.0" pr="refrakt-md/refrakt#717" %}

# Indent nested runes in site content with refrakt format

The documentation site is the largest body of refrakt content in the repository, and the first
place a reader copies examples from. Once {% ref "WORK-657" /%} can apply {% ref "SPEC-170" /%}
D5 mechanically, run it over the site, so nested runes read as nested and the examples teach the
rule.

## Acceptance Criteria

- [x] `refrakt format` has been run over `site/content/`, in a commit of its own that contains nothing else
- [x] Every changed file parses to the same AST as before, and the site's rendered HTML is byte-identical, asserted once for the whole site
- [x] Rune examples inside fences in the docs follow the rule too, where they show nesting
- [x] `refrakt format --check` covers `site/content/` in CI from this point
- [x] The resolution records how many files changed and confirms that `plan/` needed no changes

## Approach

The formatter refuses a file whose AST would change, so a refused file is a finding: either
the formatter has a bug, or the file relied on the old indentation behaviour. Record each one in
the resolution and fix it before the run is committed.

## Blocked by

- {% ref "WORK-657" /%}

## References

- {% ref "SPEC-170" /%}: D4, D5.

## Resolution

Completed: 2026-10-25

Branch: `claude/v0-42-0-planning-t31f5e`

### What was done
- **`9f7af02`: the formatter run alone.** 104 of 326 files under `site/content` re-indented, none refused.
- `34472fc` re-indents `runes/surfaces.md`. The first run misread it, because a fence there holding `{% card %}` tags was not escaped (see notes).
- `803cc1d`: rune examples in `markdoc`/`md` fences that show nesting were re-indented with `formatIndentation` and reviewed: 44 fences in 21 files. Nothing outside fence contents changed.
- `refrakt format --check` covers `site/content` in CI (`npm run format:md:check`, in `validate.yml`).

### Verification
- **AST:** every changed file parses to the same AST as before, with the shared parse and as the pipeline parses (`escapeFenceTags`).
- **Rendered site** (`vite build`, 316 pages, build hashes and the build date normalised): 294 pages byte-identical. The other 22 differ only by tab characters, all inside page source displayed by `{% preview source=true %}`; that is the formatted source being shown.
- **plan/:** not run (see WORK-657).

### Notes
The migration exposed three bugs, each fixed in its own commit:
- `1fc1214`: tab-indented `markdoc` lost its highlighting (`@refrakt-md/highlight` and the VS Code grammar). `preview`'s source `trim()`med before `dedent`.
- `a9bb611`: `escapeFenceTags` did not recognise an indented fence, so its tags were parsed as real tags (caught by `validate --deep`).
- `6df4c97`: whitespace-only lines inside fences now move with the fence.

{% /work %}
