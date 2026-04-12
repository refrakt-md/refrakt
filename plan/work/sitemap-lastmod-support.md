{% work id="WORK-087" status="done" priority="low" complexity="simple" tags="content, seo" milestone="v1.0.0" source="SPEC-029" %}

# Add Sitemap lastmod Support Using File Timestamps

> Ref: SPEC-029 (Broader Impact — Sitemap)

Depends on: WORK-084 (variable injection into content pipeline)

## Summary

The sitemap generator in `packages/content/src/sitemap.ts` currently emits no `<lastmod>` tags. With `$file.modified` available in the content pipeline, sitemap generation can include `<lastmod>` for each page, helping search engines prioritize crawl frequency.

## Acceptance Criteria

- [x] Sitemap XML output includes `<lastmod>` elements for pages that have a `file.modified` value
- [x] `<lastmod>` uses ISO 8601 date format (`YYYY-MM-DD`)
- [x] Pages without a modification date omit `<lastmod>` rather than emitting an empty element
- [x] Existing sitemap output structure (URL, priority, changefreq if present) is unaffected
- [x] Test verifying `<lastmod>` appears in sitemap output when file timestamps are available

## Approach

1. In `packages/content/src/sitemap.ts`, read `file.modified` from page data during serialization
2. Emit `<lastmod>` element within the `<url>` block when the value is present
3. Add test case

## References

- {% ref "SPEC-029" /%} (Broader Impact — Sitemap)
- {% ref "WORK-084" /%} (variable injection — dependency)
- `packages/content/src/sitemap.ts` — sitemap generator

{% /work %}
