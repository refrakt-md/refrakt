{% work id="WORK-062" status="done" priority="medium" complexity="simple" tags="cli, metadata" milestone="v0.9.0" source="SPEC-024" %}

# Inspector Metadata Audit

> Ref: SPEC-024 (Metadata System — Inspector Audit)

Depends on: WORK-060 (Annotate Rune Configs with Metadata Dimensions)

## Summary

Add a `--audit-meta` flag to `refrakt inspect` that verifies metadata configuration across all runes: which meta types are in use, which status/category fields have sentiment maps, and whether the theme provides CSS for all meta types and sentiments.

## Acceptance Criteria

- [x] `refrakt inspect --audit-meta` shows meta types in use with rune counts
- [x] Audit shows sentiment coverage — which fields with sentiment maps vs. which lack them
- [x] Audit checks theme CSS for `[data-meta-type]`, `[data-meta-sentiment]`, and `[data-meta-rank]` selectors
- [x] Missing theme rules are flagged as warnings
- [x] Output is clear and actionable for theme developers
- [x] `--json` flag works with `--audit-meta` for programmatic use

## Approach

Extend the existing inspector audit infrastructure. Walk all rune configs, collect structure entries with `metaType`, group by type/sentiment. Compare against CSS selectors found in the theme's stylesheets. Report gaps.

## References

- SPEC-024 (Metadata System — Inspector Audit)

{% /work %}
