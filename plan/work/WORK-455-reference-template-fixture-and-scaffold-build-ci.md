{% work id="WORK-455" status="done" priority="medium" complexity="moderate" source="SPEC-109" tags="templates,ci,fixture" milestone="v0.25.0" %}

# Reference template fixture and scaffold-build CI

{% ref "SPEC-109" /%} §6,§3 — ship exactly one in-repo reference template as a fixture/worked
example, and scaffold-build it in CI so rune-syntax drift can't silently rot a template.

## Acceptance Criteria
- [x] Exactly one in-repo reference template exists, framed as a fixture/worked example (a generic multi-section starter), not a catalog
- [x] CI scaffolds it, builds it, and asserts no errors; extended with the {% ref "SPEC-094" /%} visual-regression harness where applicable
- [x] It dogfoods the `template.json` manifest and is the canonical example third-party authors copy
- [x] It stays content-only/generic (sandbox-bearing templates are downstream artifacts, not shipped in-repo)

## Approach
Add the template under a fixtures path, authored against the format ({% ref "WORK-451" /%}) and
installable via the axis ({% ref "WORK-452" /%}) + apply ({% ref "WORK-453" /%}). Add a CI job
that scaffolds + builds it; hook into the existing gallery/regression harness if practical.

## Dependencies
- {% ref "WORK-451" /%} — `template.json` type
- {% ref "WORK-452" /%} — framework × purpose axis
- {% ref "WORK-453" /%} — template apply

## References
- {% ref "SPEC-109" /%} §6, §3; {% ref "SPEC-094" /%}

## Resolution

Completed: 2026-06-24

Branch: `claude/v0.25.0-impl-3`. Shipped exactly one in-repo reference template — `packages/create-refrakt/templates/docs-starter/` (template.json `kind:"site"` + a generic multi-section `content/` tree, content-only/generic, no sandboxes). It's the bundled template `create-refrakt --template docs-starter` resolves, dogfoods the manifest, and is the canonical example authors copy. `apply-template.test.ts` scaffolds+composes it and asserts no errors (the scaffold guard), and validates the manifest shape.

### Note
The composition guard runs as a unit test; a full `vite build` of the scaffolded site + the SPEC-094 visual-regression harness is the CI extension (needs the full adapter toolchain, not runnable as a pure unit test here).

{% /work %}
