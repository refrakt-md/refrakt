---
title: Reference Pages
description: How a rune's reference page is laid out, and what belongs on it
---

# Reference pages

A rune's reference page is for someone writing content with it. It answers four questions: what is this rune for, how do I write it, what does it look like, and what can I change? Structure, selectors and pipeline detail belong in the theme- and rune-authoring handbooks, where their readers look for them; `refrakt inspect <rune>` and the structure contract state them exactly.

## The shape of a page

Every page follows the same order. A section appears only when it has something to say.

1. **The intro.** `{% include file="rune-intro.md" variables={r: "rune:<name>"} /%}`, the page's first line. It renders the package, title, description, badges and the Install and Source actions, from data. Do not write a `# Title` of your own.
2. **One opening paragraph.** What the rune is for. Where a reader could mistake it for a neighbour, add one line: "For a full-width opening band, use [hero](/runes/marketing/hero)."
3. **Basic usage.** The smallest real example, as a `{% preview source=true %}`.
4. **How Markdown is read**, when the rune reinterprets Markdown: a short table of what each kind of content becomes.
5. **One section per task.** Name it for what the reader wants to do ("Add a rating", "Put the media beside the text"), and show it with one preview.
6. **Attributes.** Always `## Attributes`, always the generated table:

   ```markdoc
   ## Attributes

   {% include file="rune-attributes.md" variables={r: "rune:<name>"} /%}
   ```

   One include, of the page's own rune. It renders the rune's child runes too, each under its own heading, so a page never includes a child's table. Do not write an attribute table by hand: a task section explains an attribute and shows it, and the generated table states its values.
7. **See also**, when there is something to link.

## Examples

- **A preview, not a code fence**, whenever the rune renders something. A fence is for what a preview cannot show: configuration, a command, a file written elsewhere.
- **One idea per preview.** Variants that differ in one attribute are one preview and a sentence, not one preview each.
- **Real content.** No placeholder text, and no copy about how refrakt works inside.

## What does not belong

- HTML structure, BEM classes, `data-*` attributes and custom properties. A line saying what a theme can target is fine ("style it through `[data-rune="hero"]`"); a list of selectors is not.
- Plan IDs and decision numbers. A reader cannot open them.
- Release history: what changed, what was renamed, how to migrate. That is the release note's job.

`npm run runes:check-docs` checks the parts it can: that the intro opens the page, that there is one attribute include under `## Attributes` with only "See also" after it, and that no install hint or hand-written title is left.
