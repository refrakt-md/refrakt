{% spec id="SPEC-198" status="draft" tags="composition, functions, values, preview, sandbox, template, architecture" %}

# Content-to-text value functions: `source` and `output`, and `preview` as a composition

## Summary

`preview` shows a demo three ways: its source, the demo rendered, and the demo's rune output as
HTML. Today it does all three in its own transform, with two privileges no other rune has: it
reads the page's raw text, and it runs Markdoc's transform inside its own. That is why
{% ref "SPEC-194" /%} lists it among the runes that need a `prepare` stage and treats it as one
opaque slot (D8).

This spec takes the three jobs apart into general pieces:

- **one rule:** a template function may turn content into text, never text into content (D1);
- **`source(slot)`:** the text the author wrote for a slot (D2);
- **`output(slot)`:** the slot's rune output before the engine runs, as HTML (D3). It is a second
  stage and may be dropped without affecting the rest;
- **a block code primitive** that takes its content as a value (D4);
- **`preview` becomes a composition**, with no `prepare` stage and no privileges (D5, D6).

The motivation is fewer special cases, not new capability. The conversion is worth doing even if
`output` is dropped and `preview` loses its HTML panel.

## Prerequisites

| Needs | From | State on 2026-11-11 |
|---|---|---|
| The value vocabulary, `$slots`, `text()` | {% ref "SPEC-195" /%} | accepted |
| The raw-source exception this removes | {% ref "SPEC-194" /%} D2, D8 | accepted |
| Pasted content remembers its file | {% ref "SPEC-197" /%} D5 | draft |
| Templates and fragments | {% ref "SPEC-168" /%} | draft |

## What exists, measured

*Measured 2026-11-11, `plugins/design/src/tags/preview.ts`.*

| Job | How `preview` does it today | Weakness |
|---|---|---|
| Source panel | a fence written inside it is the source (`sourceFenceIndex`, `:109`); otherwise it cuts the page's raw text (`config.variables.__source`) between **its own** opening and closing lines, and dedents it (`:183`) | correct only when the demo is written inline on the page: inside a composition or after `include`, its own lines point into another file |
| Rendered demo | runs `Markdoc.transform` on its remaining children inside its own transform (`:204`) | a nested transform, which SPEC-194 D2 forbids to code in general |
| HTML panel | pretty-prints that transform's result (`renderRuneHtml`, `:41`, `:210`) | pre-engine output; the behaviour's own comment says so (`packages/behaviors/src/behaviors/preview.ts:55`) |
| Tabs, light/dark, viewport widths | the `preview` behaviour, from `data-name` parts and the `theme` and `responsive` attributes | none; already general |

Placed slot content keeps its source position: composition's `cloneNode` copies `lines` and
`location` onto every node it places (`packages/runes/src/lib/composition.ts:1372`).

No block code primitive takes its content as a value. `code` is inline only
(`packages/runes/src/tags/code.ts`), and `snippet` reads files.

## Decisions

### D1: template functions turn content into text, never text into content

- **Allowed:** functions whose argument is content and whose result is a string a template can
  only display: `text()` ({% ref "SPEC-195" /%}), `source()`, `output()`.
- **Not allowed:** a function that parses or transforms a string into content (`parse()`,
  `transform()`, `render()`). Once a template can do that:
  - `contracts`, SPEC-177's checks and the editor can no longer see a template's structure
    without content;
  - a theme or plugin template, which ships in a third-party package, could turn an attribute's
    string into runes;
  - SPEC-194 D2's rule that code computes values and never builds trees no longer holds.
- **Parsing, transforming and rendering are a library API**, for tools rather than templates.
  `parse` (`@refrakt-md/runes`) and `renderToHtml` (`@refrakt-md/transform`) exist already; they
  are documented as the public way for tools to do it.

### D2: `source(slot)` is the text the author wrote

- **Returns** the source of the slot's nodes, from the first node's first line to the last node's
  last line, dedented, with blank lines at either end trimmed.
- **Reads each node's own position**, not the template's. Inline content reads the page's text;
  content placed by a composition keeps its lines (`cloneNode`); content pasted by `include`
  reads the file named in its `location` ({% ref "SPEC-197" /%} D5).
- **An empty slot** returns the empty string.
- **Any composition may call it.** It replaces SPEC-194 D2's named exception: no definition
  declares `input: [source]`, and no rune's context carries the page's raw text.

### D3: `output(slot)` is the slot's rune output before the engine runs

*A second stage. The rest of this spec does not depend on it, and it may be dropped.*

- **Returns** the slot's output after the composition's own transform and before the identity
  transform, as indented HTML. It is the rune's theme-independent contract: `data-rune`,
  `data-field`, `data-name`.
- **It is a late value.** A template's values are worked out while the template is expanded,
  before `Markdoc.transform` runs (`composition.ts:1255`), so the slot has no output yet:
  - expansion leaves a placeholder where the value is used;
  - after the composition's transform, the placeholder is filled from the nodes the slot actually
    produced, found by their `data-slot` marks;
  - the slot is transformed once. Transforming it a second time for the value would run
    registration, side tables, heading ids and counters twice.
  - `{% metablock %}` is the precedent: a marker filled after the transform (`composition.ts:258`).
- **Composition's bookkeeping is removed** from the string: `data-owner`, `data-slot`.
- **The pretty-printer moves to `@refrakt-md/transform`**, from `preview`'s `renderRuneHtml`.
- **A late value may only be displayed.** It cannot appear in `{% if %}`, in a variant selector,
  in `computes`, or anywhere a value decides structure; doing so reports `late-value-in-decision`.
  It is accepted in a display position, D4's `content`.
- **For a rune drawn by a component** ({% ref "ADR-049" /%}), the output is its rune node, printed.

Accurate *final* HTML, after the engine and the renderer, is out of scope. If wanted later, it is a
behaviour that captures a stage's rendered HTML in the browser, or a build-time step in adapters
that see the final HTML string.

### D4: a block code primitive takes its content as a value

```md
{% codeblock language="markdoc" content=source($slots.demo) /%}
```

- A primitive (`role: primitive`), template-only, as `attribution` and `frame` are
  ({% ref "SPEC-194" /%} D13).
- **Renders exactly as a fence would**, through the same highlighting, so it needs no CSS of its
  own.
- `content` accepts a string value, including a late one (D3). `language` is a string.
- It exists because SPEC-194 D11 lets elements come only from primitives, and nothing else can
  turn a value into a code block.

### D5: `preview` becomes a composition in the design plugin

```md
{% template %}
	{% group name="stage" %}
		{% slot name="demo" /%}
	{% /group %}
	{% codeblock name="source" language="markdoc" content=first(text($slots.fence), source($slots.demo)) /%}
	{% codeblock name="html-source" language="html" content=output($slots.demo) /%}
{% /template %}
```

- **Content model:** an optional fence (an author's explicit source, as today) and the demo.
- **Attributes stay:** `title`, `theme`, `responsive`, `source`. The behaviour reads them from the
  root as today.
- **The behaviour finds the code blocks by `data-name`** (`source`, `html-source`), as it does
  today. A primitive placement taking `name` is checked against SPEC-194 D11 when the primitive
  is built.
- **Without D3,** the `html-source` block is left out and the HTML panel goes away. That is
  acceptable.
- **SPEC-194 changes:** `preview` leaves D6's list of runes that need `prepare`, D8's "the whole
  arrangement" row is removed, and D2's exception names only `sandbox`.
- **`sandbox` stays native.** It puts raw HTML into an iframe; that is not a demo of content.

### D6: refrakt's own site shows examples through a site composition

`site/runes/demo.md`, not shipped in any package:

```md
{% demo %}
Use different types to convey different levels of importance.

---

{% include file="core:hint.md#all-types" /%}
{% /demo %}
```

- **Content model:** delimited by `---`: prose above, the demo below. A delimiter is needed
  because a demo can itself be paragraphs (`badge` is inline).
- **Its template** places the prose, then a `preview` around the demo slot.
- `include` runs before the transform ({% ref "SPEC-141" /%}), so the composition sees the pasted
  example as if it had been written inline, and `source()` reads it from the definition file.
- It is named `demo`, not `example`, so it is not confused with SPEC-197's definition block, and
  not `showcase`, which is an existing core rune.

## Implementation order

1. `source()` and the `codeblock` primitive.
2. `preview` as a composition without the HTML panel, through SPEC-181's staging; then the
   SPEC-194 amendments.
3. The site's `demo` composition, once SPEC-197's `file#name` addressing lands.
4. `output()`, if a second user appears or the HTML panel is missed.

## Acceptance criteria

- [ ] `source(slot)` returns a slot's authored text, correct for inline content, content placed by a composition and content pasted by `include`
- [ ] No rune's context carries the page's raw text; SPEC-194 D2's exception names only `sandbox`
- [ ] No template function parses or transforms a string into content, and a test pins the function registry to that rule (D1)
- [ ] The `codeblock` primitive renders a string value as a fence would, with highlighting
- [ ] `preview` is a definition with no `prepare` stage, its tabs, theme and viewport behaviour unchanged
- [ ] Every `preview` on the site renders, and every difference from today's output is listed and accepted
- [ ] `site/runes/demo.md` shows an example included by name, with its source panel correct
- [ ] If D3 lands: `output(slot)` is filled from the slot's single transform, without composition marks, and a late value in a deciding position reports `late-value-in-decision`

## Open questions

1. **Does `preview` keep the explicit fence?** It lets an author show source that differs from the
   demo (simplified, or annotated). Keeping it costs one optional field and one `first()`.
2. **Where `output()`'s placeholder lives.** A marker node like `metablock`'s, or a value type in
   SPEC-195's vocabulary. The second is more general; the first exists.
3. **`source()` and SPEC-170 indentation.** A demo written indented inside a block tag is dedented
   to its least-indented line. Check that this matches what authors expect inside nested tags.

## References

- {% ref "SPEC-194" /%}: D2's raw-source exception, D6, D8, D11, D13
- {% ref "SPEC-195" /%}: the value vocabulary and `text()`
- {% ref "SPEC-197" /%}: examples, `file#name` addressing, pasted content's origin
- {% ref "SPEC-141" /%}: preprocess, which runs `include` before the transform
- {% ref "SPEC-181" /%}: staging a composition before it goes live
- {% ref "ADR-049" /%}: components and their output

{% /spec %}
