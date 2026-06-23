{% work id="WORK-448" status="in-progress" priority="high" complexity="moderate" source="SPEC-116" tags="create-refrakt,scaffolding,peerdeps,build" milestone="v0.25.0" %}

# Bake ADR-023 peerDeps, compat range, devDeps and build wiring into scaffolds

{% ref "ADR-023" /%} compliance and the day-one-build guarantee ({% ref "SPEC-116" /%} §3–§4)
must be embodied by every scaffold so an author starts correct rather than remembering the
policy. This is the shared scaffolding helper the per-kind scaffolders consume.

## Acceptance Criteria
- [ ] Scaffolded packages declare `@refrakt-md/*` as `peerDependencies` with a minor range — no exact ordinary deps on `@refrakt-md/*`
- [x] The manifest carries a matching `refrakt` range, pinned to the scaffolding create-refrakt version (single source)
- [ ] Scaffolds also seed matching `devDependencies` (same ranges) so the peer-only deps resolve for an isolated build
- [ ] Build is wired (tsconfig, `dist/` output, exports map) so every contract path resolving to built output works after `npm install && npm run build` with no hand-editing
- [ ] A freshly scaffolded package passes its own manifest-validate; `build` and `manifest-validate` scripts are present
- [x] A JSON-carrier preset pack is contract-valid with no compile step

## Approach
A shared helper produces the `package.json` deps block, tsconfig, exports map, and scripts,
keyed by kind. Reuse the `refrakt` range util (the ADR-023 manifest-fields work item) and the
create-refrakt version source that the site scaffold already uses for version derivation.

## Dependencies
- {% ref "WORK-465" /%} — the `refrakt` range field + checker
- {% ref "WORK-447" /%} — the `--type` dispatch this hangs off

## References
- {% ref "SPEC-116" /%} §3, §4; {% ref "ADR-023" /%}

{% /work %}
