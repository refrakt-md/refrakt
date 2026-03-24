{% work id="WORK-068" status="done" priority="medium" complexity="simple" tags="cli, dimensions" milestone="v0.9.0" %}

# Inspector Dimensions Audit

> Ref: SPEC-025 (Universal Theming Dimensions — Inspector Audit)

Depends on: WORK-063 (Density), WORK-064 (Section Anatomy), WORK-066 (Media Slots)

## Summary

Add a `--audit-dimensions` flag to `refrakt inspect` that verifies universal theming dimension coverage: surface assignments, density theming, section anatomy theming, interactive state theming, and media slot theming. Flags community runes missing surface assignments and any dimension values without corresponding theme CSS.

## Acceptance Criteria

- [x] `refrakt inspect --audit-dimensions` shows surface assignments with rune counts and unassigned runes
- [x] Audit shows density coverage across all three levels
- [x] Audit shows section anatomy coverage for all 6 section roles
- [x] Audit shows interactive state coverage
- [x] Audit shows media slot coverage for all 5 slot types
- [x] Community runes with dimensions but no surface assignment are flagged
- [x] `--json` flag works with `--audit-dimensions`

## Approach

Extend the inspector audit. Walk all rune configs collecting dimension declarations. Walk theme CSS collecting `[data-density]`, `[data-section]`, `[data-state]`, `[data-media]` selectors. Cross-reference and report gaps.

## References

- SPEC-025 (Universal Theming Dimensions — Inspector Audit)

{% /work %}
