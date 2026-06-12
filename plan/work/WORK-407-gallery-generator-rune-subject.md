{% work id="WORK-407" status="done" priority="high" complexity="complex" source="SPEC-094" milestone="v0.22.0" tags="theme,cli,gallery,tooling,html-adapter" %}

# Gallery generator — rune subject

A CLI command that emits a deterministic static **rune gallery**: every rune across its variant
matrix, on one page, rendered through the HTML adapter. This is the AI-iteration surface and the
deterministic subject the harness ({% ref "WORK-409" /%}) photographs.

## Scope

- A `refrakt gallery` command (inspect/contracts family, `packages/cli`) reusing the inspect pipeline (parse → transform → serialize → identity transform → `renderToHtml`), extended from one rune to the whole catalogue (core `defineRune` entries + plugins from `refrakt.config.json`).
- Variant matrix derived from config / `structures.json`.
- Render via the HTML adapter's `renderPage` into a self-contained static file per mode (light/dark), with the theme's CSS and fonts inlined/linked.
- Determinism: fixed sample content + dates, fonts actually loaded (tactically link Lumina's fonts; the full theme-owned-font system is deferred), animations/caret disabled.
- Emit a stable `data-gallery-cell` anchor per variant for per-rune clipping.

## Acceptance Criteria

- [x] `refrakt gallery` emits a self-contained static HTML artifact covering every catalogue rune across its variants, per mode.
- [x] Output is deterministic across runs (fixed content/dates, no animation) and theme-agnostic (driven by config + theme CSS).
- [x] Each variant carries a stable `data-gallery-cell` anchor.
- [x] The generator lives in the public CLI with **no browser dependency**.

## References

- {% ref "SPEC-094" /%} · `packages/cli/src/commands/inspect.ts` · `packages/html/src/render.ts` (`renderPage`) · `refrakt contracts` / `structures.json`.

## Resolution

Completed: 2026-06-12

Branch: `claude/work-407-gallery-generator`

### What was done
- **`refrakt gallery` command** (`packages/cli`): `bin.ts` dispatch + `runGallery` (flags `--theme`, `--out`/`-d`, `--site`) + help text; `commands/gallery.ts` orchestration; `lib/gallery.ts` pure helpers. No new dependency — renders via `renderToHtml` from `@refrakt-md/transform` (the right primitive for a bare multi-rune page; `@refrakt-md/html`'s `renderPage` is layout-oriented and unneeded), so **no browser dependency**.
- **Pipeline reuse**: mirrors `inspect`'s parse → transform → serialize → identity-transform → `renderToHtml`, run per rune × variant. The project's *assembled* config drives the render (so plugin runes are covered); `--theme`'s CSS is resolved from its `.` export and **flattened** (`@import` inlined recursively) into a self-contained `<style>`.
- **Two static artifacts per run**: `<theme>.light.html` / `<theme>.dark.html` (dark = `<html data-theme="dark">`), each with charset/viewport/`color-scheme` meta, tactically-linked web fonts (Inter + JetBrains Mono — defers the §6 theme-owned-font system), inlined theme CSS, and gallery chrome that **disables animation/transition/caret** for stable screenshots.
- **Per-variant anchors**: every cell carries `data-gallery-cell="<rune>--<variant>"` (+ `data-rune`/`data-variant`), grouped under `data-gallery-rune` sections.
- **Tests** (`test/gallery.test.ts`, 8): `flattenCssImports` (recursive inline, remote-import passthrough, cycle-safe) and `renderGalleryDocument` (anchors, grouping, dark attr, CSS inline + anim-disable, determinism).
- `.gallery/` added to `.gitignore`.

### Key scoping decision — variant matrix
A naïve "every enum attribute × every value" produced **3976 cells** because nearly every rune inherits the cross-cutting surface-model axes (`bg-*`, `substrate-*`, `frame-*`, `scrim-*`, `width`, `spacing`, `inset`, `elevation`, `tint-*`, `density`, `cover`, …) from SPEC-086–090. Those are a *theme dimension*, not a rune's identity, and are already showcased in `surfaces.md`. The gallery therefore **excludes universal axes** and expands each rune's **own** semantic modifiers, capped at 16 cells/rune. Result: 51 runes, **239 cells**, ~580 KB/file (down from ~3.5 MB).

### Notes / limitations
- Determinism verified: byte-identical across runs; light/dark differ only by the `<html>` attr + title.
- `requiresParent` child runes (tab, tab-panel, …) are skipped (not standalone-renderable).
- Some runes emit transform *warnings* to stderr when rendered standalone (e.g. `frame` on `nav` with no media) — cosmetic, not in the HTML.
- The universal surface dimensions are not shown per-rune; a future refinement could add a small dedicated "surfaces" section (a few representative runes × each universal axis). The fixture-resolution seam ({% ref "SPEC-102" /%}) can later swap the content source.
- Verified: full build clean; 126 CLI tests green (incl. 8 new); gallery runs against the repo config (`--site main`).

{% /work %}
