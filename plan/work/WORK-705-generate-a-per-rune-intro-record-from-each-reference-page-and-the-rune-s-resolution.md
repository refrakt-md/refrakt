{% work id="WORK-705" status="done" priority="medium" complexity="moderate" source="SPEC-187" tags="docs, runes, reference, data, tooling, seo" milestone="v0.48.0" pr="refrakt-md/refrakt#770" %}

# Generate a per-rune intro record from each reference page and the rune's resolution

SPEC-187 D5: the rune intro renders from data. One record per rune, beside the attribute records
`scripts/generate-rune-attributes.mjs` already writes.

## Acceptance Criteria
- [x] Each rune with a reference page has one record with `title`, `description`, `package`, `composed`, `status`, `schemaType` and `source`, and no `install` field (D8)
- [x] `title`, `description` and `status` are read from the reference page's frontmatter, not repeated anywhere else
- [x] `composed` and `source` come from how the rune resolves on the `main` site: a composition's `.md` definition, or a native rune's schema file, as a repo-relative path
- [x] `schemaType` is the type the rune's resolved schema row publishes with its defaults, the row `refrakt inspect <rune> --site main` prints; it is the default when an attribute changes the type or can switch it off, and empty when the rune publishes nothing (D9)
- [x] The drift check fails when the committed data differs from a fresh run, as it does for the attribute data
- [x] A test covers one core rune, one native plugin rune, one composed rune, and one rune that publishes no structured data

## Approach
Extend `generate-rune-attributes.mjs` or add a sibling; SPEC-187 leaves the choice open. Reading
resolution from the loaded plugins, not a list, means WORK-702 to WORK-704 flip `composed` with no
edit here.

## References
- {% ref "SPEC-187" /%}: D4, D5, D8, D9.
- {% ref "SPEC-128" /%}: the generated attribute data.
- {% ref "SPEC-130" /%}: D5, visibility in place of validation.

## Resolution

Completed: 2026-11-03

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#770

### What was done
- `scripts/rune-intro.mjs`: builds one record per rune reference page and writes `site/content/_data/rune-intro.json` (99 records). Wired into `scripts/generate-rune-attributes.mjs`, so `npm run runes:attributes` writes it and `--check` covers both files.
- Fields: `rune`, `title`, `description`, `status`, `unstable`, `package`, `packageLabel`, `packageUrl`, `plugin`, `composed`, `source`, `publishes`, `schemaType`, `schemaUrl`. No `install` (D8).
- `scripts/rune-intro.test.mjs`: synthetic core / native plugin / composed / no-schema runes; against the repo, every rune page has a record, every source exists, the composed set is `cta, hero, testimonial`, and the committed file is fresh.

### Notes
- A separate file rather than a sixth partition of `rune-attributes.json`: that artifact's partition list is pinned by its tests and its query shape.
- `composed`/`source` rest on SPEC-153 D3: a plugin cannot define a rune in both `Plugin.runes` and its `runeDir`, so a `<runeDir>/<rune>.md` in the owning package is the definition. Each plugin's `runeDir` is read from the plugin module, not assumed. A record whose source names no file fails the build.
- `schemaType` is `reference dump`'s `schemaOrg.type`, the row's default (playlist: `MusicAlbum`, its fallback).
- Booleans (`composed`, `unstable`, `plugin`, `publishes`) exist because Markdoc's `{% if %}` treats `""` as true.

{% /work %}
