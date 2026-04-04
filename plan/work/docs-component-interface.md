{% work id="WORK-122" status="done" priority="medium" complexity="moderate" tags="docs, site, themes, packages" milestone="v1.0.0" %}

# Document framework-native component override interface

> Ref: ADR-008 (Framework-native component interface for rune overrides)

Depends on: WORK-119 (Svelte renderer), WORK-120 (generic type interfaces)

## Summary

Update the site documentation to cover the new component override interface — how component authors receive props, slots/snippets, and the tag escape hatch. This spans theme docs (writing component overrides), package docs (exporting typed interfaces), and authoring docs (the output contract).

## Acceptance Criteria

- [x] `site/content/docs/themes/components.md` updated with new section on the component override interface (props, snippets, tag escape hatch)
- [x] Svelte 5 example showing a typed component override using `$props()` with `RecipeProps<Snippet>`
- [x] Explanation of what arrives in slots (identity-transformed content with BEM classes)
- [x] Explanation of when to use the `tag` escape hatch vs props/slots
- [x] `site/content/docs/packages/authoring.md` updated with guidance on exporting generic `Props<R>` interfaces from community packages
- [x] `site/content/docs/authoring/output-contract.md` updated to mention that properties become component props and refs become component slots
- [x] Cross-reference to `refrakt inspect --interface` for discoverability (once WORK-121 is done)
- [x] Code examples use TypeScript with proper generic parameter usage

## Approach

1. Add a "Component Override Interface" section to `themes/components.md` covering the three-part contract: props (from properties), snippets (from refs), children (anonymous content), plus the tag escape hatch
2. Add a recipe component walkthrough as the primary example
3. Update package authoring docs with type export guidance
4. Update output contract docs to connect properties/refs to the component interface


## Resolution

Completed: 2026-04-04

Branch: `claude/adr-008-implementation-nBN9K`

### What was done
- Added "Component Override Interface" section to `site/content/docs/themes/components.md` with table, Svelte 5 recipe example, and key points about identity-transformed content, nested refs, and escape hatch
- Added "Exporting typed component interfaces" section to `site/content/docs/packages/authoring.md` with GameItem example showing BaseComponentProps usage
- Added "Component override mapping" subsection to `site/content/docs/authoring/output-contract.md` with properties→props, refs→slots mapping table
- All code examples use TypeScript with proper generic parameter usage
- Cross-references to `refrakt inspect --interface` included

### Notes
- Documentation follows existing style and structure of each file
- Recipe component used as primary example since it has rich properties and refs
