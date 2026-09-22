{% work id="WORK-590" status="ready" priority="high" complexity="moderate" source="SPEC-131" tags="snippet, file-ref, codemod, migration, docs, drift" milestone="v0.37.0" %}

# The codemod and the migration of the 23 line-addressed invocations

The item that removes the live exposure. Everything before it builds capability;
this one spends it.

The measured surface in `site/content` today:

| | count |
|---|---|
| `{% snippet %}` invocations | 37 |
| …of which line-addressed (`lines=`) | **23** |
| `{% file-ref %}` invocations | 10 |

Each of those 23 has a 100% silent-wrong exposure to any edit above its range.
Several already slice mid-construct: `packages/runes/src/util.ts:42-50` opens on
a blank line, and three separate `lang-map.ts` slices open in the middle of a
comment block.

## {% ref "BUG-020" /%} is resolved here

Three published references — `runes/file-ref.md:51`, `runes/drawer.md:155` and
`runes/file-ref.md:75` — carried a `file-ref` labelled `SiteConfig` pointing at
`packages/types/src/theme.ts` lines 74–125. `SiteConfig` is not in that file (it
is at `packages/types/src/config.ts:42-148`), and `theme.ts` is 104 lines long,
so 21 of the 52 requested lines did not exist. The drawer opened onto the back
half of `ThemeManifest`, the whole of `LayoutDefinition`, and the start of
`ComponentDefinition`.

On the documentation page for the rune whose addressing model is the subject of
the spec.

**This item is the bug's fix (2). Fix (1) has already landed**
(refrakt-md/refrakt#639) — the ranges were corrected on their own branch rather
than waiting on this milestone, because the `file-ref` doc page was teaching
the broken pattern by example. That correction restored accuracy and left the
addressing exposure exactly where it was.

So by the time the codemod runs these are **ordinary migrations**, pointing at
the right files with the right ranges, and they convert like the other
nineteen. The bug closes here, on the anchoring rather than on the ranges.

Two corrections to the bug's original account, both recorded on it:

- **Of the three invocations it names, only `file-ref.md:51` renders.** The
  other two sit inside ` ```markdoc ` fences, so they were wrong *examples*
  rather than wrong drawers. For the codemod this matters: a fenced invocation
  is not a resolvable target, so it cannot be verified byte-identically and
  must be rewritten by hand to match whatever the live ones become.
- **There is a fourth**, `file-ref.md:40`, labelled `SiteThemeConfig` and
  therefore missed by a `SiteConfig` grep. It anchors to `theme.ts`, not
  `config.ts`.

## Why a codemod rather than a hand migration (D7)

Converting 23 invocations by hand is tedious and exactly the kind of change
where a slip reintroduces the bug being fixed. The codemod reads each current
slice, infers an anchor from its first meaningful line, rewrites the invocation,
and **verifies the new resolution produces a byte-identical slice** — refusing
to rewrite when it does not.

The diff stays reviewable; the verification is what makes it trustworthy.

## Two things the verification does not cover

- **The comparison runs before `reindent`** ({% ref "WORK-589" /%}), or every
  nested target fails verification for a difference the codemod itself
  introduced.
- **Companion attributes need their own check.** An invocation carrying
  `highlight=` needs those coordinates preserved or rewritten as
  `highlight-match=` (D13), and byte-identical verification covers the slice
  only, not the highlight. `{% snippet path="…/lang-map.ts" lines="10-40"
  linenumbers=true highlight="18-22" /%}` is live on the `snippet` doc page and
  has to become something.

## Regex-literal lexing lands here if needed

D8 defers `/…/` lexing from {% ref "WORK-586" /%} — perhaps 15 more lines,
causing the single silent-wrong case and most of the 62 refusals in the
measurement. Pick it up **only if** the migration surfaces refusals that need
it. Do not do it speculatively.

## Acceptance Criteria

- [ ] A `--fix` codemod converts `lines=` invocations to anchors, verifying byte-identical output and refusing to rewrite when it differs
- [ ] The codemod's byte-identical check compares the slice before `reindent` is applied
- [ ] An invocation carrying `highlight=` or `linenumbers=` is either preserved with its coordinates or rewritten to `highlight-match=`, with its own verification separate from the slice check
- [ ] The 23 line-addressed snippets in `site/content` are migrated, or individually justified as intentionally line-addressed
- [ ] {% ref "BUG-020" /%}'s four references are anchored — `symbol="SiteConfig"` on the three in `config.ts`, `symbol="SiteThemeConfig"` on the one in `theme.ts` — and {% ref "BUG-020" /%} is closed
- [ ] The codemod does **not** stamp {% ref "SPEC-134" /%} `reviewed` markers on anything it migrates
- [ ] Which languages and formats the migration actually reached is recorded, as the input to D15's deferred config-surface decision

## Approach

Run the codemod, read every hunk, and treat a refusal as information rather than
an obstacle — a refusal means the anchor engine could not reproduce the slice,
which is exactly the case where a human should look at what that snippet was
pointing at.

Expect some of the 23 to be *legitimately* line-addressed: several are
demonstrations on the `snippet` doc page itself, deliberately showing the
`lines=` form. Those should keep it and say so, which is why the criterion reads
"migrated, or individually justified".

## Blocked by

- {% ref "WORK-588" /%} — `section` and `paired` are what make the non-TypeScript half of `site/content` addressable at all
- {% ref "WORK-589" /%} — the `reindent` ordering the verification depends on

## Notes

**Do not auto-stamp review markers** ({% ref "SPEC-134" /%} D8). A marker
asserting that a human reviewed 23 regions nobody looked at is a false claim in
precisely the shape {% ref "SPEC-134" /%} exists to prevent. The criterion above
is stated negatively on purpose.

This item is also the input to D15: record which languages and formats came up,
because that is what decides the shape of the config surface if one ever ships.

## References

- {% ref "SPEC-131" /%} — D7 (the codemod), D8 (regex literals, conditionally picked up here), D13 (companion attributes), D15 (this phase is the input), D16 (the ordering)
- {% ref "BUG-020" /%} — the live instance this closes
- {% ref "SPEC-134" /%} — D8, the no-bulk-stamping rule this item must respect
- `site/content/runes/drawer.md`, `site/content/runes/file-ref.md` — the three affected drawers

{% /work %}
