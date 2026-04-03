{% work id="WORK-053" status="ready" priority="medium" complexity="moderate" tags="sveltekit, packages, css" milestone="v1.0.0" %}

# CSS Fallback Resolution for Third-Party Packages

> Ref: SPEC-001 (Community Runes — Theme Integration), WORK-001 (CSS handling section)

## Summary

Third-party community packages (e.g., `@refrakt-community/dnd-5e`) may ship default CSS as a fallback. When a theme (like Lumina) doesn't provide CSS for a community rune, the pipeline should fall back to the package's own `styles/` directory. The resolution order is: theme CSS first, package CSS second.

Currently the SvelteKit plugin's CSS tree-shaking only checks the theme directory. It needs to also check the source package when no theme CSS exists.

## Acceptance Criteria

- [ ] SvelteKit plugin checks theme's `styles/runes/{block}.css` first for each rune
- [ ] If no theme CSS exists and the rune comes from a third-party package, check the package's `styles/runes/{block}.css`
- [ ] CSS from the winning source is imported into the build
- [ ] `assembleThemeConfig` provenance map is used to locate the source package directory
- [ ] `refrakt inspect --audit` reports which rune CSS comes from the theme vs. package fallback
- [ ] Official packages (`@refrakt-md/*`) are not affected — they ship zero CSS, Lumina provides all their styling

## Approach

1. In the SvelteKit plugin's CSS tree-shaking logic, after checking the theme directory and finding no match, consult the `provenance` map from `assembleThemeConfig` to find the source package
2. If the source package has a `styles/runes/` directory with a matching CSS file, import that as fallback
3. Theme authors can override any package fallback CSS by placing their own file with the same block name in their `styles/runes/` directory
4. The audit output in `refrakt inspect` should distinguish between theme-provided and package-fallback CSS coverage

## References

- SPEC-001 (Community Runes — Theme Integration)
- WORK-001 (Official Rune Packages — CSS handling)

{% /work %}
