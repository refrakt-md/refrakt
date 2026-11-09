{% work id="WORK-716" status="done" priority="medium" complexity="moderate" source="SPEC-193" tags="docs, runes, orientation" milestone="v0.49.0" pr="refrakt-md/refrakt#785" %}

# Rune pages say how Markdown is read and when to use the rune, in place of the Section header boilerplate

SPEC-193 D6 and D1.2, D1.4. The "Section header" paragraph is repeated on 20 rune pages (twelve with
a typo), and almost no page says when to use the rune rather than its neighbour.

## Acceptance Criteria
- [x] The 20 "Section header" sections are removed
- [x] Each rune that reinterprets Markdown has a short "How Markdown is read" table, one row covering the eyebrow, headline and blurb where it reads them, linking to Page sections
- [x] Each rune with a neighbour a reader could mistake it for has a "when to use this" line in its opening (the pairs in SPEC-193 F7)
- [x] `xref.md` says that `{% ref %}` is the same rune

## Blocked by
- {% ref "WORK-712" /%}

## References
- {% ref "SPEC-193" /%}: D1, D6, F5, F7.

## Resolution

Completed: 2026-11-09

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done
- Removed the 20 "Section header" sections; non-boilerplate content kept (accordion's FAQ note became its own section, blog's preview moved under the table).
- Added "How Markdown is read" tables to ~60 rune pages that reinterpret Markdown, each row checked against the schema or composition definition; the eyebrow/headline/blurb row only where the rune reads those slots. Folded figure's "What it accepts" and the old reinterpretation tables (juxtapose, comparison, map, plot beats) into the new tables.
- Added one-sentence "when to use" lines for the SPEC-193 F7 pairs plus card/section; xref says `{% ref %}` is the same rune.
- Corrected inaccuracies found on the way: tabs (no eyebrow/headline), comparison (no header), map (route comes from `route=true`), drawer (`---` does split), recipe (no footer zone), api (body passes through).

### Notes
- Found BUG-050: inline `{% tint %}` parses an outdated token list, so `background`/`text` are dropped. Filed, not fixed here.

{% /work %}
