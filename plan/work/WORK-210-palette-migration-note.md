{% work id="WORK-210" status="ready" priority="low" complexity="small" tags="docs, migration, presets" source="SPEC-051" milestone="v0.14.0" %}

# v0.14.0 migration note for palette and fonts

Write the v0.14.0 migration guide entry for SPEC-051's palette and typography changes. Existing sites that depended on Lumina's cream-and-navy appearance will see neutral default after upgrading; the one-line opt-in (`presets: ["@refrakt-md/lumina/presets/tideline"]`) restores the colour appearance. Tideline also brings Plex Sans typography by default, replacing the previous Outfit — a font pin is available for users who want Outfit specifically.

## Acceptance Criteria

- [ ] A "Palette and typography" section exists in the v0.14.0 migration guide (same destination page as {% ref "WORK-199" /%} — coordinate locations during implementation)
- [ ] The section opens with the user-facing change: "Lumina ships with a new neutral default palette in v0.14.0. The previous cream-and-navy palette is preserved as the `tideline` preset."
- [ ] The one-line config snippet for restoring the old colour appearance is shown verbatim
- [ ] The font change is documented: tideline switches `font.sans` to IBM Plex Sans (from Outfit). The escape hatch for pinning Outfit is shown:
  ```json
  {
    "theme": {
      "presets": ["@refrakt-md/lumina/presets/tideline"],
      "tokens": {
        "font": { "sans": "'Outfit', system-ui, sans-serif" }
      }
    }
  }
  ```
- [ ] A note explaining the rationale (one or two sentences linking to {% ref "SPEC-051" /%} for the full story)
- [ ] Cross-references to {% ref "WORK-199" /%} (tint shape migration) — both pieces are part of the same v0.14.0 upgrade story

## Approach

Single docs PR. The destination page is whatever the v0.14.0 migration guide lives in — coordinate with {% ref "WORK-199" /%} so they end up in the same place.

The voice is matter-of-fact, not alarmed — most users won't notice the default change because they haven't been hand-customising Lumina anyway. For the small set of users who have hand-tuned around the cream palette, the one-line opt-in restores everything.

## Dependencies

- {% ref "WORK-200" /%}, {% ref "WORK-204" /%}, {% ref "WORK-203" /%} — the changes being documented must be merged and shipping.

## References

- {% ref "SPEC-051" /%} — full rationale and the implementation step explicitly calling for this migration note
- {% ref "WORK-199" /%} — sibling migration note for tint shape changes

{% /work %}
