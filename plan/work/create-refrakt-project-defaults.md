{% work id="WORK-052" status="ready" priority="medium" complexity="simple" tags="create-refrakt, packages" milestone="v1.0.0" source="SPEC-001" %}

# Create-Refrakt Project Type Defaults

> Ref: SPEC-001 (Community Runes — New Project Defaults)

## Summary

New projects created with `create-refrakt` should pre-install official packages relevant to their use case. "Starting a landing page" pre-installs `@refrakt-md/marketing`. "Starting a docs site" pre-installs `@refrakt-md/docs`. Users can remove packages they don't need or add community packages afterward.

## Acceptance Criteria

- [ ] `create-refrakt` prompts for project type (or accepts it as an argument via `--type`)
- [ ] Project type determines which official packages are pre-installed
- [ ] Pre-installed packages are added to `package.json` dependencies
- [ ] Pre-installed packages are listed in `refrakt.config.json` `packages` array
- [ ] A "blank" or "minimal" option installs no extra packages (core only)
- [ ] Template mapping covers at least: landing page → marketing, docs site → docs, blog → none (core only), storytelling → storytelling

## Approach

Add a project type selector to the `create-refrakt` scaffold flow. Define a mapping from project type to package list. When generating `package.json` and `refrakt.config.json`, include the selected packages. The template already derives dependency versions from its own `package.json` at runtime, so version sync is automatic.

## References

- {% ref "SPEC-001" /%} (Community Runes — New Project Defaults)

{% /work %}
