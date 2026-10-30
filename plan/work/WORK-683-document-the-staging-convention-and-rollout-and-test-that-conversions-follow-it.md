{% work id="WORK-683" status="done" priority="medium" complexity="simple" source="SPEC-181" tags="runes, composition, staging, rollout, docs, tests" milestone="v0.44.0" pr="refrakt-md/refrakt#737" %}

# Document the staging convention and rollout, and test that conversions follow it

Every conversion of a plugin rune into a composition is staged until it goes live, and goes
live on its own ({% ref "SPEC-181" /%} D5, D6). Writing that down is not enough to make it
happen, so this item also adds a test that fails when a conversion skips staging.

## Acceptance Criteria

- [x] `CLAUDE.md` has a section on converting a plugin rune to a composition: stage in `site/staged-runes/<rune>.md` with a `prefer` entry, test against that file, review with `npm run dev:staging`, and go live in a separate work item once the four rollout gates are met
- [x] The rune authoring docs (`site/content/extend/rune-authoring/`) describe the staging site and the go-live steps
- [x] A test fails when a composed definition in any test fixture directory has the name of a rune a shipping plugin provides, and its message names `site/staged-runes/` as the place to use
- [x] The v0.44.0 milestone's "Replacing the plugin runes is a separate step" section and SPEC-147's comparison process point at SPEC-181 for where the comparison is reviewed and how runes go live

## Blocked by

- {% ref "WORK-681" /%}

## References

- {% ref "SPEC-181" /%}: Rollout, D5, D6.

## Resolution

Completed: 2026-10-30

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `CLAUDE.md`: "Converting a plugin rune to a composition (staging)". It covers staging with a `prefer` entry, making the content valid on both sites, testing against the staged file, reviewing with `dev:staging` / `build:staging` / `validate --site staging`, and going live in a separate item once the four gates are met.
- `site/content/extend/rune-authoring/composed-runes.md`: "Converting a plugin rune: staging, then going live", with the gates and the go-live steps. `runes.schema` is linked from the D25 section and from the `project-schema` error row.
- `site/content/docs/configuration/plugins.md`: `runes.schema`, described as an assertion of review rather than a convenience.
- `packages/content/test/staging-convention.test.ts`:
  - fails when a composed definition under any test fixture directory has a shipping plugin rune's name (or alias); its message names `site/staged-runes/<rune>.md`;
  - fails when a staged rune has a copy in a fixture directory;
  - fails when the exception list goes stale.

  I checked it fires on a planted `hero.md`.
- `plan/milestones/v0.44.0.md` ("Replacing the plugin runes is a separate step") and SPEC-147 D2 point at SPEC-181 for where the comparison is reviewed and how runes go live.

### Notes
- The test's exception list holds the conversions that predate staging, each naming the item that stages it:
  - `bond`, `character`, `faction`, `lore`, `realm`: WORK-682;
  - `steps`, SPEC-169's content-model fixture: WORK-678.

{% /work %}
