{% work id="WORK-216" status="done" priority="low" complexity="simple" tags="docs, cascade, tint, design-runes" source="SPEC-052" milestone="v0.14.0" %}

# /docs/themes/tint-cascade documentation page

Author the canonical documentation page for the tint cascade. Uses refrakt's own site configuration as the worked example (since the site itself adopts the cascade in {% ref "WORK-215" /%}). Explains the four cascade levels, the locked-vs-preferred distinction, the `tint` / `tint-mode` / `tint-lock` fields, and the YAML null-vs-missing idiom. Uses design-plugin runes (`palette`, `swatch`) where helpful to visualise the tint side of the cascade.

## Acceptance Criteria

- [x] `/docs/themes/tint-cascade` page exists, rendered by the site
- [x] Opens with a one-paragraph framing of what the cascade is and why it exists (Linear/Stripe/Vercel patterns referenced briefly)
- [x] Documents the four cascade levels (global → layout → page → rune) with a worked example for each
- [x] Documents the three frontmatter fields with type signatures and value semantics
- [x] Explains locked-vs-preferred — when `tint-lock: true` matters, what the toggle UI does in each case
- [x] Calls out the YAML null-vs-missing idiom — `tint: null` (or `tint: ~`) explicitly resets, missing inherits — with a small worked example
- [x] Uses refrakt's own site configuration as the canonical full example: the actual `_layout.md` frontmatter for marketing-vs-docs split
- [x] Links to {% ref "SPEC-052" /%} for the full design rationale (rather than rewriting it)
- [x] Cross-links to {% ref "WORK-208" /%}'s preset docs pages where appropriate
- [x] Page renders cleanly on `cd site && npm run dev`

## Approach

Documentation page authored in `site/content/docs/themes/tint-cascade.md`. Uses Markdoc with design-plugin runes where useful — `palette` to visualise the tint surface tokens, `preview` for live examples of pages rendering under different cascade states (if practical to mock up).

Use refrakt's own configuration as the worked example throughout — it's already the live demo of the cascade (per {% ref "WORK-215" /%}), so the docs page can point at the running site as "see this in action, the page you're reading right now is the docs subtree behaving the way this page describes."

The YAML null-vs-missing section deserves a clear example because it's a foot-gun:

```yaml
# This resets an inherited named tint to nothing:
tint: ~

# This inherits the named tint from the layer above:
# (no tint field at all)
```

## Dependencies

- {% ref "WORK-212" /%}, {% ref "WORK-213" /%}, {% ref "WORK-214" /%} — cascade must be implemented before the docs describe it.
- {% ref "WORK-215" /%} — the refrakt site's adoption is the canonical example.

## References

- {% ref "SPEC-052" /%} — the spec this docs page documents
- {% ref "WORK-208" /%} — preset documentation pages that this should cross-link with

{% /work %}
