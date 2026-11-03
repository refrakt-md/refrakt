{% work id="WORK-705" status="ready" priority="medium" complexity="moderate" source="SPEC-187" tags="docs, runes, reference, data, tooling" milestone="v0.48.0" %}

# Generate a per-rune intro record from each reference page and the rune's resolution

SPEC-187 D5: the rune intro renders from data. One record per rune, beside the attribute records
`scripts/generate-rune-attributes.mjs` already writes.

## Acceptance Criteria
- [ ] Each rune with a reference page has one record with `title`, `description`, `package`, `install`, `composed`, `status` and `source`
- [ ] `title`, `description` and `status` are read from the reference page's frontmatter, not repeated anywhere else
- [ ] `composed` and `source` come from how the rune resolves on the `main` site: a composition's `.md` definition, or a native rune's schema file, as a repo-relative path
- [ ] `install` is the npm command for a plugin rune and empty for a core rune
- [ ] The drift check fails when the committed data differs from a fresh run, as it does for the attribute data
- [ ] A test covers one core rune, one native plugin rune and one composed rune

## Approach
Extend `generate-rune-attributes.mjs` or add a sibling; SPEC-187 leaves the choice open. Reading
resolution from the loaded plugins, not a list, means WORK-702 to WORK-704 flip `composed` with no
edit here.

## References
- {% ref "SPEC-187" /%}: D4, D5.
- {% ref "SPEC-128" /%}: the generated attribute data.

{% /work %}
