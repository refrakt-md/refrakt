{% bug id="BUG-020" status="fixed" severity="major" source="SPEC-131" tags="snippet, file-ref, docs, drift" milestone="v0.37.0" pr="refrakt-md/refrakt#648" %}

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

| File | Line | Resolves? |
|---|---|---|
| `site/content/runes/file-ref.md` | 51 | **Yes** — inside `{% preview source=true %}` |
| `site/content/runes/drawer.md` | 155 | No — inside a ` ```markdoc ` fence |
| `site/content/runes/file-ref.md` | 75 | No — inside a ` ```markdoc ` fence |

All three carry `lines="74-125" label="SiteConfig"`.

**Only line 51 actually renders a wrong drawer.** The other two sit inside
fenced code blocks, which Markdoc does not execute — they are *examples
teaching the wrong coordinates* rather than broken renders. Both still want
fixing, for a different reason: the `file-ref` doc page is demonstrating the
pattern, so a reader copies whatever it shows.

The Actual section above describes line 51. Read it as one wrong drawer plus
two wrong examples rather than three wrong drawers.

### A fourth, and it is not `SiteConfig`

Found while checking the three above; missed when this bug was filed because it
carries a different label.

`site/content/runes/file-ref.md:40` reads
`{% file-ref path="packages/types/src/theme.ts" lines="42-58" label="SiteThemeConfig" /%}`.
`SiteThemeConfig` **is** in `theme.ts`, so the path is right and the symbol has
not moved — but the range is wrong at both ends: the interface is `theme.ts`
**19–49**, so line 42 lands inside a doc comment in the middle of it and line
58 is nine past the closing brace.

Two pieces of prose echo those numbers and are wrong with it: line 37 (`lines`
accepts … a range (`"42-58"`)) and line 43 (the `#L42-L58` GitHub anchor).

This is the *ordinary* drift this bug's headline case is not — no move, no
rename, just a range that slid as the file was edited above it. Worth recording
separately because it is the failure mode {% ref "SPEC-131" /%} expects to be
common, and this bug's own example turned out to be the rarer kind.

### Two captions making a weaker version of the same claim

Neither resolves, and both assert `theme.ts` holds `SiteConfig`'s fields:

- `site/content/runes/diff.md:115,123` — `source=` labels on hand-written
  fences whose content is `contentDir` / `theme` / `target` / `overrides` /
  `routeRules`. The fence content is authored inline, so nothing is read; the
  label is simply naming the wrong file. Line 133's prose cites the same
  coordinates.
- `site/content/runes/codegroup.md:116` — the label-derivation example,
  `e.g. theme.ts:74-125`.

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

**(1) is done** — refrakt-md/refrakt#639, on its own branch so it did not wait
on this milestone. Verified against the current sources rather than this bug's
text: `config.ts:42` opens `SiteConfig` and `:148` closes it; `theme.ts:19`
opens `SiteThemeConfig` and `:49` closes it. That PR covers all four
invocations and both captions, plus the prose that echoes their numbers.

(2) is {% ref "WORK-590" /%}, where these become ordinary migrations alongside
the other nineteen. **This bug stays open until then.** Accuracy is restored;
the exposure that produced it is not, and closing here would record the wrong
thing — the range is still a coordinate, and the next move or rename breaks it
again just as silently.

## Notes

This bug is evidence for SPEC-131's Problem section. The spec argued the
failure *would* happen to a `SiteConfig` reference; it already had, in the
documentation for the rune whose addressing model is at issue. Any fix should
land alongside the spec's observed-exposure note rather than quietly
correcting the range.

**The count in the title is wrong in both directions**, which is itself worth
keeping rather than tidying away. Three invocations were named; one of them
renders, and a fourth broken reference went unnoticed because it carries a
different label. Nobody miscounted carelessly — the references were read from
a grep for `SiteConfig`, which finds what shares a label and not what shares a
failure mode.

That is the argument for {% ref "SPEC-136" /%}'s `touching` query in one
paragraph. An index keyed on the *path* would have returned all six references
to `theme.ts` at once, including the `SiteThemeConfig` one and the two
captions, without anyone having guessed which symbols to search for.

## Resolution

Completed: 2026-09-24

Fixed by WORK-590 (refrakt-md/refrakt#648).

Fix (1), correcting the ranges, landed separately in refrakt-md/refrakt#639
because the `file-ref` doc page was teaching the broken pattern by example.
This is fix (2): all four references are now anchored by name, so the class of
failure is removed rather than the instance.

| Reference | Now |
|---|---|
| `file-ref.md:31` | `symbol="SiteThemeConfig"` |
| `file-ref.md:67` | `symbol="SiteConfig"` (rewritten by the codemod, byte-identical verified) |
| `file-ref.md:91` | `symbol="SiteConfig"` (fenced example, rewritten by hand) |
| `drawer.md:155` | `symbol="SiteConfig"` (fenced example, rewritten by hand) |

A label can no longer disagree with what the drawer shows: the region is
resolved from the symbol the label names, and a symbol that is renamed or
deleted now fails loudly instead of rendering whatever occupies those lines.

The `lines=` example in the 'Anchoring to a line range' section was repointed
at CHANGELOG.md — a file with no symbols in it, which is when a line range is
actually the right tool. Documenting `lines=` on a source declaration was
teaching the pattern this bug is about.

{% /bug %}
