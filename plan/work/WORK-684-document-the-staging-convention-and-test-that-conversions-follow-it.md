{% work id="WORK-684" status="ready" priority="medium" complexity="simple" source="SPEC-181" tags="runes, composition, staging, docs, tests" milestone="v0.44.0" %}

# Document the staging convention and test that conversions follow it

Every future conversion of a plugin rune into a composition has to use staging until it goes
live ({% ref "SPEC-181" /%} D8). Writing that down is not enough to make it happen, so this item
also adds a test that fails when a conversion skips it.

## Acceptance Criteria

- [ ] `CLAUDE.md` has a section on converting a plugin rune to a composition: stage in `plugins/<plugin>/staging/<rune>.md`, test against that file, review at `/staging/<reference page>`, and go live in a separate work item by `git mv` into the plugin's `runeDir`
- [ ] The rune authoring docs (`site/content/extend/rune-authoring/`) describe staging and the mirror pages
- [ ] A test fails when a composed definition in any test fixture directory has the name of a rune a shipping plugin provides, and its message names the staging path to use
- [ ] The v0.44.0 milestone's "Replacing the plugin runes is a separate step" section, and SPEC-147's comparison process, point at SPEC-181 for where the comparison is reviewed

## Blocked by

- {% ref "WORK-682" /%}

## References

- {% ref "SPEC-181" /%}: D7, D8.

{% /work %}
