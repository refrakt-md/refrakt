{% work id="WORK-122" status="ready" priority="medium" complexity="moderate" tags="docs, site, themes, packages" milestone="v1.0.0" %}

# Document framework-native component override interface

> Ref: ADR-008 (Framework-native component interface for rune overrides)

Depends on: WORK-119 (Svelte renderer), WORK-120 (generic type interfaces)

## Summary

Update the site documentation to cover the new component override interface — how component authors receive props, slots/snippets, and the tag escape hatch. This spans theme docs (writing component overrides), package docs (exporting typed interfaces), and authoring docs (the output contract).

## Acceptance Criteria

- [ ] `site/content/docs/themes/components.md` updated with new section on the component override interface (props, snippets, tag escape hatch)
- [ ] Svelte 5 example showing a typed component override using `$props()` with `RecipeProps<Snippet>`
- [ ] Explanation of what arrives in slots (identity-transformed content with BEM classes)
- [ ] Explanation of when to use the `tag` escape hatch vs props/slots
- [ ] `site/content/docs/packages/authoring.md` updated with guidance on exporting generic `Props<R>` interfaces from community packages
- [ ] `site/content/docs/authoring/output-contract.md` updated to mention that properties become component props and refs become component slots
- [ ] Cross-reference to `refrakt inspect --interface` for discoverability (once WORK-121 is done)
- [ ] Code examples use TypeScript with proper generic parameter usage

## Approach

1. Add a "Component Override Interface" section to `themes/components.md` covering the three-part contract: props (from properties), snippets (from refs), children (anonymous content), plus the tag escape hatch
2. Add a recipe component walkthrough as the primary example
3. Update package authoring docs with type export guidance
4. Update output contract docs to connect properties/refs to the component interface
