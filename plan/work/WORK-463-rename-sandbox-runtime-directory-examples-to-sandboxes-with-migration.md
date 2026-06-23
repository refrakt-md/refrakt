{% work id="WORK-463" status="ready" priority="medium" complexity="simple" source="ADR-022" tags="sandbox,config,migration,rename" milestone="v0.25.0" %}

# Rename sandbox runtime directory examples to sandboxes with migration

{% ref "ADR-022" /%} — rename the sandbox runtime directory config from `examples`/`examplesDir`
to `sandbox`/`dir`, with a backwards-compatible migration. The template specs
({% ref "SPEC-109" /%} §7) reference the new naming.

## Acceptance Criteria
- [ ] `SiteConfig.sandbox.examplesDir` is renamed to `sandbox.dir` (type + readers/writers); the old name is accepted with a deprecation warning during a migration window
- [ ] `assembleFromDirectory` and the sandbox sources reader use the new field
- [ ] A migration note (and codemod where practical) updates existing configs
- [ ] Docs and `{% sandbox %}` references use the new naming

## Approach
Update `packages/types/src/theme.ts` (`SiteConfig.sandbox`) and
`packages/runes/src/sandbox-sources.ts`. Read both names for a release, preferring the new
one and warning on the old.

## References
- {% ref "ADR-022" /%}; `packages/runes/src/sandbox-sources.ts`; `packages/types/src/theme.ts`

{% /work %}
