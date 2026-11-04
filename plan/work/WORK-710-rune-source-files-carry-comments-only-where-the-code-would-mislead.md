{% work id="WORK-710" status="in-progress" priority="medium" complexity="moderate" tags="runes, source, comments, docs" milestone="v0.48.0" %}

# Rune source files carry comments only where the code would mislead

The rune intro's Source drawer shows every rune's source file to readers. Those files carried
2,278 comment lines against 13,095 lines of code, 382 of them citing specs, work items, bugs and
ADRs: history and cross-references written for whoever was implementing, not for someone reading
the rune. The `call-to-action` alias was also dropped by omission when `cta` went live, not by a
decision, and comes back.

## Acceptance Criteria
- [ ] Comments in `packages/runes/src/tags/*.ts` and every plugin's `src/tags/*.ts` are removed, except tool directives (`biome-ignore`, `@ts-…`, `eslint-…`, `@deprecated`) and a one-line comment where the code would otherwise mislead
- [ ] No comment or user-facing string in those files, or in a plugin's `runes/*.md`, cites a plan entity, except an ID given as an example of its format; a test enforces it
- [ ] The composed `cta` declares `aliases: [call-to-action]`; the `refrakt migrate cta` codemod, its test and its docs are removed, and the unreleased changeset says the alias stays
- [ ] Builds, tests, contracts and the generated rune data are unchanged apart from the rewritten descriptions

{% /work %}
