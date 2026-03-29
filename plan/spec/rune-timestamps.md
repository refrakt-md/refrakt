{% spec id="SPEC-029" status="draft" tags="content, pipeline, runes, plan" %}

# File-Derived Timestamps for Runes

> Expose file-level `created` and `modified` timestamps as Markdoc variables so any rune can consume them as attribute defaults, with explicit attribute values taking precedence.

## Problem

Plan runes (and potentially other runes) benefit from knowing when content was created and last modified. The `plan-activity` rune already derives `mtime` from git via a standalone scanner (`runes/plan/src/scanner.ts`), but this is package-specific, runs outside the content pipeline, and only provides modification time — not creation time.

There is no general-purpose mechanism for runes to access file timestamps. Authors who want timestamps must manually maintain them in frontmatter, which is tedious and error-prone.

## Design

### Markdoc Variables

Inject two new variables into every page's Markdoc transform config:

| Variable | Type | Description |
|----------|------|-------------|
| `$file.created` | `string` (ISO 8601 date) | When the file was first committed |
| `$file.modified` | `string` (ISO 8601 date) | When the file was last committed |

These join the existing `$page` and `$frontmatter` variables already injected in `packages/content/src/site.ts`.

### Timestamp Resolution Order

A three-tier fallback chain, consistent with the approach already proven in the plan scanner:

1. **Frontmatter override** (highest priority) — if `created` or `modified` appear in frontmatter, use those values directly. This gives authors full control.
2. **Git history** — derive timestamps from `git log`. This is the expected default for any content in a repository.
3. **Filesystem stat** (lowest priority) — fall back to `fs.stat().birthtimeMs` / `fs.stat().mtimeMs`. Only meaningful for local-only content that has never been committed.

When none of the above produce a value, the variable is `undefined` and runes that consume it should handle the absence gracefully (e.g., omit a date display).

### Rune Consumption

Runes opt in by declaring `created` and/or `modified` attributes with variable defaults:

````markdoc
{% spec id="SPEC-001" created=$file.created modified=$file.modified %}
````

For plan runes specifically, the schema defaults could reference `$file.created` and `$file.modified` so authors don't need to write them out — the attributes populate automatically. Authors override by setting an explicit value:

````markdoc
{% spec id="SPEC-001" created="2025-06-15" %}
````

This follows standard Markdoc attribute resolution: explicit values take precedence over variable defaults.

### Schema Default Pattern

Markdoc schemas can declare default values that reference variables. In the rune schema definition:

```typescript
attributes: {
  created: {
    type: String,
    description: 'Creation date (ISO 8601). Defaults to file creation date.',
    default: { $variable: 'file.created' },
  },
  modified: {
    type: String,
    description: 'Last modified date (ISO 8601). Defaults to file modification date.',
    default: { $variable: 'file.modified' },
  },
}
```

This approach requires verifying that Markdoc supports variable references in attribute defaults. If it does not, an alternative is to resolve the defaults during the schema transform phase by reading the variables from the transform config.

## Implementation

### Phase 1 — Git Timestamp Utility

Create a shared utility in `packages/content/` (or a new shared location) that batch-collects git timestamps for all files in a content directory. This can reuse the pattern from `runes/plan/src/scanner.ts:getGitMtimes()` but extended to also capture creation times.

**Git commands:**

```bash
# Last modified: most recent commit timestamp per file (already proven in plan scanner)
git log --format="%at" --name-only --diff-filter=ACMR HEAD

# First created: earliest commit timestamp per file
git log --format="%at" --name-only --diff-filter=A --reverse HEAD
```

Both commands run once per `loadContent()` call, not per file. The results are indexed into `Map<string, { created: number; modified: number }>`.

**Performance consideration:** For large repos, these git commands complete in milliseconds to low seconds. The plan scanner already runs a similar command without issues. Results can be cached in memory for the duration of a build.

### Phase 2 — Variable Injection

In `packages/content/src/site.ts`, within the `loadContent()` loop, add the timestamps to `contentVariables`:

```typescript
const contentVariables: Record<string, unknown> = {
  frontmatter,
  page: { url: route.url, filePath: route.filePath, draft: route.draft },
  file: {
    created: frontmatter.created ?? gitTimestamps.get(page.filePath)?.created ?? statCreated,
    modified: frontmatter.modified ?? gitTimestamps.get(page.filePath)?.modified ?? statModified,
  },
  // ...existing sandbox helpers
};
```

The git timestamp map is computed once before the page loop. Filesystem stat is called per-file only when git data is missing.

### Phase 3 — Plan Rune Schemas

Add `created` and `modified` attributes to the plan rune schemas (`spec`, `work`, `bug`, `decision`, `milestone`) with appropriate defaults. Update the plan rune configs in `runes/plan/src/config.ts` to display the timestamps in the rendered output (e.g., in the header metadata area alongside status and priority badges).

### Phase 4 — Plan Scanner Consolidation

The plan scanner's `getGitMtimes()` can be refactored to use the shared utility from Phase 1, reducing duplication. The scanner's `mtime` field would then be sourced from the same data as `$file.modified`, ensuring consistency between the activity feed and rune attributes.

## Edge Cases

### Shallow Clones

`git clone --depth=1` loses history. In a shallow clone:
- `modified` still works (the single commit has a timestamp)
- `created` is unreliable (the first visible commit may not be the actual creation)

The utility should detect shallow clones (`git rev-parse --is-shallow-repository`) and either omit `created` or mark it as approximate. This is an acceptable limitation — CI/CD systems that use shallow clones rarely need creation dates.

### Renamed Files

Git tracks renames with `--follow`, but the batch approach doesn't use `--follow` (it's per-file). A renamed file would show the rename commit as its creation date. This is acceptable — the rename is effectively a new file in the content structure, and authors can override with frontmatter if the original date matters.

### Non-Git Content

Content directories outside a git repo (or with git unavailable) fall through to filesystem timestamps. This supports local development and non-git workflows without errors.

### Date Format

All timestamps are normalized to ISO 8601 date strings (`YYYY-MM-DD`) rather than full datetime strings. This matches the existing `date` frontmatter convention and the plan scanner's display format. Full datetime precision is available internally but truncated at the variable level for consistency.

## Alignment with Blog Dates

The blog system already uses a `date` frontmatter field for publication date, consumed by `blogArticleLayout` (in `packages/transform/src/layouts.ts`) and blog index sorting. This is a distinct semantic concept from file timestamps:

| Concept | Source | Meaning | Example |
|---------|--------|---------|---------|
| `date` (frontmatter) | Author-set | Publication / effective date | When a post goes live |
| `$file.created` | Git / fs | File creation date | When the `.md` was first committed |
| `$file.modified` | Git / fs | Last content change | When the `.md` was last edited |

**Design principles for coexistence:**

1. **`$file.created` does not replace `date`.** A draft may sit for weeks before publishing — the publication date is an editorial choice, not a file event. Blog authors continue to set `date` in frontmatter explicitly.

2. **`$file.modified` complements `date`.** Layouts can display both: "Published March 2, 2026" (from `date`) and "Last updated March 28, 2026" (from `$file.modified`). The layout engine's existing `pageText` + `dateFormat` + `pageCondition` infrastructure in `StructureEntry` already supports this — a layout can reference `file.modified` just like it references `frontmatter.date`.

3. **Same format, same formatting path.** `$file.created` and `$file.modified` use ISO 8601 date strings (`YYYY-MM-DD`), matching the `date` frontmatter convention. The layout engine's `dateFormat` option works on both without changes.

4. **Fallback for `date` itself.** For blogs or pages where the author omits `date`, the frontmatter parser could default `date` to `$file.created`. This is opt-in (configured in the layout or schema, not automatic) to avoid surprising authors who intentionally omit dates.

### Layout Integration Example

A blog article layout could display both publication and modification dates:

```typescript
// In blogArticleLayout structure entries:
{
  tag: 'time',
  ref: 'date',
  pageText: 'frontmatter.date',
  dateFormat: { year: 'numeric', month: 'long', day: 'numeric' },
  attrs: { datetime: { fromPageData: 'frontmatter.date' } },
},
{
  tag: 'time',
  ref: 'updated',
  pageText: 'file.modified',
  pageCondition: 'file.modified',
  dateFormat: { year: 'numeric', month: 'long', day: 'numeric' },
  attrs: { datetime: { fromPageData: 'file.modified' } },
},
```

This renders: "Published March 2, 2026 · Updated March 28, 2026" — using the same formatting infrastructure, no new mechanisms needed.

## Broader Impact

Beyond blog and plan runes, several other systems benefit from or are affected by file-derived timestamps:

### Sitemap (`packages/content/src/sitemap.ts`)

The sitemap currently emits no `<lastmod>` tags. With `$file.modified` available in the pipeline, sitemap generation can include `<lastmod>` for each page — search engines use this to prioritize crawl frequency. This is a straightforward enhancement: read `file.modified` from page data during sitemap serialization.

### SEO / JSON-LD (`packages/runes/src/seo.ts`)

The SEO extractor collects structured data via RDFa annotations but does not auto-inject `datePublished` or `dateModified` into JSON-LD output. These are important schema.org properties for blog posts, articles, and documentation pages. With file timestamps available, layouts or runes could emit RDFa-annotated `<meta>` tags that the SEO extractor picks up, or the extractor could inject them directly from page-level data.

### Entity Registry (`packages/runes/src/config.ts` register hook)

The core pipeline `register()` hook currently stores `date: page.frontmatter.date` in the entity registry. Pages without a frontmatter `date` get `undefined`, which causes them to sort to the bottom in blog indexes. If the pipeline populates `file.created` before registration, the register hook could fall back to it: `date: page.frontmatter.date ?? page.file?.created`. This would make blog posts without explicit dates sort by creation time rather than disappearing to the end.

### Decision Rune (`runes/plan/src/tags/decision.ts`)

The decision rune already has a `date` attribute for "date decided." This is semantically close to `$file.created` (when the ADR was first written). The schema could default `date` to `$file.created`, saving authors from manually setting it while preserving the override path.

### Changelog Rune (`runes/docs/src/tags/changelog.ts`)

Parses dates from version headings like "v2.1.0 - 2024-01-15". Not directly affected, but unreleased changelog entries (without a date in the heading) could display `$file.modified` as "last updated" to indicate recent activity.

### Plan Activity Consolidation

The `plan-activity` rune currently gets `mtime` from the plan scanner's `getGitMtimes()` — a separate code path from the content pipeline. With file timestamps in the pipeline, the activity rune's data source and the rune attribute values would be unified, eliminating the possibility of inconsistent dates between the activity feed and individual rune displays.

## Scope Boundaries

- **In scope:** `$file.created`, `$file.modified` variables; plan rune schema updates; shared git utility; sitemap `<lastmod>` support
- **Out of scope:** Per-rune timestamps (tracking when individual runes within a file were added/changed — this would require AST-level git diffing and is a separate, much harder problem)
- **Out of scope:** Automatic frontmatter injection (writing timestamps back into `.md` files)
- **Out of scope:** Build-time caching of git data across incremental builds (can be added later if performance requires it)
- **Out of scope:** Auto-injecting `datePublished`/`dateModified` into JSON-LD (this is a follow-on enhancement that depends on the SEO extractor's design)

{% /spec %}
