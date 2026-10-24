{% work id="WORK-658" status="ready" priority="medium" complexity="simple" source="SPEC-170" tags="site, content, formatting, markdoc" milestone="v0.42.0" %}

# Indent nested runes in site content with refrakt format

The documentation site is the largest body of refrakt content in the repository, and the first
place a reader copies examples from. Once {% ref "WORK-657" /%} can apply {% ref "SPEC-170" /%}
D5 mechanically, run it over the site, so nested runes read as nested and the examples teach the
rule.

## Acceptance Criteria

- [ ] `refrakt format` has been run over `site/content/`, in a commit of its own that contains nothing else
- [ ] Every changed file parses to the same AST as before, and the site's rendered HTML is byte-identical, asserted once for the whole site
- [ ] Rune examples inside fences in the docs follow the rule too, where they show nesting
- [ ] `refrakt format --check` covers `site/content/` in CI from this point
- [ ] The resolution records how many files changed and confirms that `plan/` needed no changes

## Approach

The formatter refuses a file whose AST would change, so a refused file is a finding: either
the formatter has a bug, or the file relied on the old indentation behaviour. Record each one in
the resolution and fix it before the run is committed.

## Blocked by

- {% ref "WORK-657" /%}

## References

- {% ref "SPEC-170" /%}: D4, D5.

{% /work %}
