{% work id="WORK-447" status="in-progress" priority="high" complexity="simple" source="SPEC-116" tags="create-refrakt,scaffolding,cli" milestone="v0.25.0" %}

# create-refrakt --type plugin|template|preset-pack dispatch

`create-refrakt --type` accepts only `site|theme|plan` (`packages/create-refrakt/src/bin.ts`).
{% ref "SPEC-116" /%} §1 extends it with the three distributable kinds and dispatches each to
its own scaffolder. This is the thin CLI seam; the scaffolder bodies land in their own work
items (plugin, theme, template, preset-pack).

## Acceptance Criteria
- [ ] `--type` accepts `plugin`, `template`, `preset-pack` alongside `site|theme|plan`; `site` stays the default
- [ ] Each new kind dispatches to its scaffolder; the existing `--scope` plumbing is reused for package naming
- [x] An invalid `--type` value errors with the full list of valid kinds
- [x] Existing `site`/`theme`/`plan` behaviour is unchanged

## Approach
Update flag parsing + the dispatch table in `bin.ts`. Keep the scaffolder functions in
`scaffold.ts` (or a `scaffolders/` split) so each kind's work item can land independently.

## References
- {% ref "SPEC-116" /%} §1
- `packages/create-refrakt/src/bin.ts`, `packages/create-refrakt/src/scaffold.ts`

{% /work %}
