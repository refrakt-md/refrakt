{% bug id="BUG-019" status="confirmed" severity="major" source="SPEC-131" tags="snippet, file-ref, docs, drift" %}

# file-ref drawers labelled SiteConfig render three unrelated interfaces

Three live pages point a `file-ref` at a line range that no longer contains the
symbol it is labelled with — and no longer exists in the file at all. This is
the exact failure {% ref "SPEC-131" /%} describes as its motivating case,
observed rather than predicted.

## Steps to Reproduce

1. Open `site/content/runes/file-ref.md` and find the invocation on line 51:
   `{% file-ref path="packages/types/src/theme.ts" lines="74-125" label="SiteConfig" preview="drawer" /%}`
2. Open the drawer.
3. Compare what it shows against `SiteConfig`.

## Expected

The drawer shows `SiteConfig` — the interface the label names.

## Actual

Three things are wrong, compounding:

- **`SiteConfig` is not in `theme.ts`.** It lives at
  `packages/types/src/config.ts:42`. The symbol moved files; no line range can
  survive that.
- **The range over-runs the file.** `theme.ts` is 104 lines long; the
  invocation asks for 74–125, so 21 of the requested lines do not exist.
- **The lines that do resolve are unrelated.** 74–104 covers the tail of
  `ThemeManifest`'s SEO fields (`defaultImage`, `logo`), then
  `LayoutDefinition` (86–93), then the start of `ComponentDefinition` (95–).

So a drawer captioned "SiteConfig" opens onto the back half of one interface
and the whole of two others. Nothing warns; the content is real code from a
real file, which is what makes it plausible enough to go unnoticed.

## Affected invocations

| File | Line |
|---|---|
| `site/content/runes/drawer.md` | 155 |
| `site/content/runes/file-ref.md` | 51 |
| `site/content/runes/file-ref.md` | 75 |

All three carry `lines="74-125" label="SiteConfig"`.

## Fix

Two options, and the second is the point of {% ref "SPEC-131" /%}:

1. **Now** — repoint at `packages/types/src/config.ts` with a corrected range.
   Restores accuracy and leaves the same exposure in place.
2. **After SPEC-131 phase 1** — replace with
   `{% file-ref path="packages/types/src/config.ts" symbol="SiteConfig" preview="drawer" /%}`,
   which makes the next move or rename a named failure instead of a wrong
   render.

Worth doing (1) immediately rather than waiting, since the pages are live and
the `file-ref` doc page is teaching the pattern by example.

## Notes

This bug is evidence for SPEC-131's Problem section. The spec argued the
failure *would* happen to a `SiteConfig` reference; it already had, in the
documentation for the rune whose addressing model is at issue. Any fix should
land alongside the spec's observed-exposure note rather than quietly
correcting the range.

{% /bug %}
