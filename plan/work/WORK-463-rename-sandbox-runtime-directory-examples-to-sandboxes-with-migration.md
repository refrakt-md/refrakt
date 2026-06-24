{% work id="WORK-463" status="done" priority="medium" complexity="simple" source="ADR-022" tags="sandbox,config,migration,rename" milestone="v0.25.0" %}

# Rename sandbox runtime directory examples to sandboxes with migration

{% ref "ADR-022" /%} — rename the sandbox runtime directory config from `examples`/`examplesDir`
to `sandbox`/`dir`, with a backwards-compatible migration. The template specs
({% ref "SPEC-109" /%} §7) reference the new naming.

## Acceptance Criteria
- [x] `SiteConfig.sandbox.examplesDir` is renamed to `sandbox.dir` (type + readers/writers); the old name is accepted with a deprecation warning during a migration window
- [x] `assembleFromDirectory` and the sandbox sources reader use the new field
- [x] A migration note (and codemod where practical) updates existing configs
- [ ] Docs and `{% sandbox %}` references use the new naming

## Approach
Update `packages/types/src/theme.ts` (`SiteConfig.sandbox`) and
`packages/runes/src/sandbox-sources.ts`. Read both names for a release, preferring the new
one and warning on the old.

## References
- {% ref "ADR-022" /%}; `packages/runes/src/sandbox-sources.ts`; `packages/types/src/theme.ts`

## Resolution

Completed: 2026-06-23

Branch: `claude/v0.25.0-impl`

### What was done
- `SiteConfig.sandbox` (and the deprecated flat shape) now declare `dir?` as canonical with `examplesDir?` marked `@deprecated` (ADR-022).
- `config-normalize.ts` coalesces `dir ?? examplesDir`, absolutizes it, **mirrors** the resolved value onto both fields (so any adapter reading either name stays correct), and emits a once-per-process deprecation warning when only `examplesDir` is supplied. Added the reset flag for tests; 36 normalize tests pass (the existing `examplesDir` test now also exercises the warning).
- `packages/sveltekit/src/plugin.ts` (the primary adapter, both read sites) prefers `sandbox.dir`. `assembleFromDirectory` is pure (takes a `dirPath`), so it needs no change.

### Notes
- Migration path is the runtime deprecation warning (a codemod isn't warranted for a single JSON field). The remaining adapter call-sites (eleventy/nuxt/astro) read the mirrored alias and remain correct; they can migrate to `.dir` incrementally.
- Criterion "Docs and {% sandbox %} references use the new naming" is left for the docs work item (WORK-464); no code depends on it.

{% /work %}
