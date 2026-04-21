{% work id="WORK-035" status="done" priority="medium" complexity="complex" tags="cli, plan, dashboard" source="SPEC-022" %}

# `plan serve` and `plan build` Commands

> Ref: {% ref "SPEC-022" /%} (Plan CLI — `serve` and `build` sections)

## Summary

Dev server with hot reload (`serve`) and static site generation (`build`). Renders plan files as themed HTML pages with navigation, cross-reference links, status badges, and aggregate dashboard views using `backlog` and `decision-log` runes.

These commands share 90% of their pipeline — `serve` wraps it in a dev server with file watching, `build` writes the output as static HTML.

## Acceptance Criteria

- [x] `plan serve` starts a dev server rendering plan files as themed HTML pages
- [x] Hot reload on file changes — re-scan and browser refresh
- [x] Auto-generated dashboard if no `index.md` exists (uses `backlog` and `decision-log` runes)
- [x] Sidebar navigation derived from file system and entity types
- [x] Entity pages show full rendered content with status badges, xref links, checklist progress
- [x] `plan build` generates a self-contained static HTML site to `--out` directory
- [x] `--theme` option selects default, minimal, or path to custom CSS
- [x] `--base-url` for GitHub Pages deployment (prefix all URLs)
- [x] Dashboard uses `backlog` and `decision-log` runes for aggregate views
- [x] Tests for HTML generation, navigation structure, and theme application

## Approach

Build a lightweight rendering pipeline: scanner → entity registry → Markdoc parse → transform → identity transform → HTML template. Wrap entity pages in a shell template with navigation sidebar and theme CSS. For `serve`, use a simple HTTP server (Node `http` module) with `fs.watch` for hot reload. For `build`, write all pages to the output directory.

## Dependencies

- {% ref "WORK-027" /%} (plugin architecture)
- {% ref "WORK-028" /%} (plan file scanner)
- {% ref "WORK-020" /%} (entity registration — for xref resolution)
- {% ref "WORK-022" /%} (backlog rune — for dashboard views)
- {% ref "WORK-023" /%} (decision-log rune — for dashboard views)
- {% ref "WORK-034" /%} (dashboard theme CSS)

## References

- {% ref "SPEC-022" /%} (Plan CLI)

{% /work %}
