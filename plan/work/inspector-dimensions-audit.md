{% work id="WORK-068" status="ready" priority="medium" complexity="simple" tags="cli, dimensions" %}

# Inspector Dimensions Audit

> Ref: SPEC-025 (Universal Theming Dimensions — Inspector Audit)

Depends on: WORK-063 (Density), WORK-064 (Section Anatomy), WORK-066 (Media Slots)

## Summary

Add a `--audit-dimensions` flag to `refrakt inspect` that verifies universal theming dimension coverage: surface assignments, density theming, section anatomy theming, interactive state theming, and media slot theming. Flags community runes missing surface assignments and any dimension values without corresponding theme CSS.

## Acceptance Criteria

- [ ] `refrakt inspect --audit-dimensions` shows surface assignments with rune counts and unassigned runes
- [ ] Audit shows density coverage across all three levels
- [ ] Audit shows section anatomy coverage for all 6 section roles
- [ ] Audit shows interactive state coverage
- [ ] Audit shows media slot coverage for all 5 slot types
- [ ] Community runes with dimensions but no surface assignment are flagged
- [ ] `--json` flag works with `--audit-dimensions`

## Approach

Extend the inspector audit. Walk all rune configs collecting dimension declarations. Walk theme CSS collecting `[data-density]`, `[data-section]`, `[data-state]`, `[data-media]` selectors. Cross-reference and report gaps.

## References

- SPEC-025 (Universal Theming Dimensions — Inspector Audit)

{% /work %}
