{% work id="WORK-551" status="done" priority="medium" complexity="simple" milestone="v0.33.0" tags="runes,authoring,data" %}

# An inline `code` rune

An inline rune that renders its body as code, so a **variable** can be code-styled.
Backticks cannot do it: a code span is literal by definition, so the Markdoc
syntax inside one is never parsed.

```markdoc
{% code %}{% $row.name %}{% /code %}   → <code>href</code>
`{% $row.name %}`                       → <code>{% $row.name %}</code>
```

## Why this is not "yet another rune that does what Markdown does"

It is the escape hatch for the **one** inline construct that is opaque to
Markdoc. Measured inside a `{% data %}` body, every other inline form passes a
variable through intact:

| Authored | Renders |
|---|---|
| `[{% $row.name %}](/runes/card)` | `<a href="/runes/card">href</a>` |
| `[**{% $row.name %}**](…)` | bold inside a link |
| `**_{% $row.name %}_**` | nested strong + em |
| `{% badge %}{% $row.name %}{% /badge %}` | `<span class="rf-badge">href</span>` |
| `` `{% $row.name %}` `` | `<code>{% $row.name %}</code>` — **literal** |

`badge` already proves a rune body takes variables. So backticks are the gap,
and a rune is the shape of every other answer in this vocabulary.

Backticks stay the right way to write *static* code, exactly as `**bold**` stays
the right way to write static emphasis. This rune is for dynamic content, and the
docs should say so rather than presenting it as an alternative spelling.

## Acceptance Criteria
- [x] `{% code %}` renders its body as `<code>`, and a variable inside it resolves
- [x] It is inline — usable mid-sentence and inside a table cell, without breaking the surrounding paragraph
- [x] Lumina styles it identically to a backtick code span, so a page mixing the two is not visibly inconsistent
- [x] A test proves the case backticks fail: the same variable, both spellings, one resolving and one literal
- [x] The rune page says it is for dynamic content and that backticks remain correct for static code
- [x] It carries no universal attributes it cannot honour — the six inline runes' posture is the precedent

## Approach

**Model it on `badge`**, the nearest existing inline rune: same posture, same
content handling, a different element and no meta fields. Not on `snippet` or
`fence` — this is an inline span, not a block, and it does no highlighting.

**No syntax highlighting.** An inline code span is not highlighted today and
should not become so here; matching the backtick span exactly is the point.

## References

- {% ref "WORK-550" /%} — the table-row body that needs this for attribute names
- {% ref "WORK-548" /%} — the rune attribute tables, where the need surfaced

## Resolution

Completed: 2026-09-11

Branch: `claude/content-author-docs-org-vps1un`

### What was done

- `packages/runes/src/tags/code.ts` — the rune. Modelled on `badge`: `inline: true`, no attributes, `transformChildren` into a `code` element, `declareUniversalPosture(code, 'inline')`.
- `packages/runes/src/index.ts` — catalog entry under "Code & Data".
- `packages/runes/src/config.ts` — `Code: { block: 'code', universalAttributes: 'inline' }`.
- `packages/lumina/test/css-coverage.test.ts` — added to `UNSTYLED_BLOCKS`: the rune deliberately renders a bare `code` element, which `global.css`'s element rule already styles, so there is no `.rf-code` rule to write.
- `site/content/runes/code.md` + nav entry.
- Tests in `packages/runes/test/data-body-table.test.ts`.

### Notes

**The claim that it renders "a bare `<code>` with no class" was wrong, and the test that "proved" it was measuring the wrong stage.** It asserted on `Markdoc.transform` output, which runs before the identity transform — and the identity transform adds `class="rf-code"` from the config entry. A real site build showed `<code class="rf-code" data-rune="code">`. The test now asserts what actually matters and is actually true: the *element* is `code`, which is what makes Lumina's `code { … }` element rule style it identically to a backtick span. `.rf-code` is a bonus hook for a theme that wants to tell them apart. The rune page was corrected to match.

**Scope held.** No syntax highlighting, no attributes. An inline backtick span is not highlighted today, and the point of the rune is to be indistinguishable from one.

**The docs frame it as the narrow escape hatch it is** — backticks stay correct for static code. The rune page carries the measured table showing that links, nested emphasis and rune bodies all pass a variable through, and only a code span does not.

{% /work %}
