---
"@refrakt-md/runes": patch
---

`{% data %}`: an attribute the rune cannot read is an error, not an empty string (BUG-010)

`resolveString` returned `''` for anything it could not resolve, and `applyWhere` treats an empty expression as *no filter*. Composed, "I could not read your filter" became "you wrote no filter" — and the page rendered the **entire** source.

```markdoc
{% data src="rune-attributes.json" where=concat("rune:", $page.slug) /%}
```

Measured on a two-row file: a valid filter rendered one row, and `concat(…)`, an undefined variable and an explicit `where=""` each rendered both. Silently. On a page filtering one rune's attributes out of a catalogue, that renders *every* rune's attributes under that rune's heading and looks entirely plausible.

An attribute that is **present but unreadable** now fails the build and says why:

```
data: `where` is a call to `concat()`, and `data` reads its attributes
      during preprocess — before functions are evaluated
data: `where` references `$missing`, which is not defined here
data: `where` is empty
```

Several are reported together, since one bad attribute usually means the call site is wrong in a way that affects more than one.

Two things deliberately unchanged:

- **Omitting an attribute is still fine.** Only keys actually present on the tag are checked, so a `data` with no `where` renders everything, as before.
- **A valid filter matching nothing still renders nothing, silently** (BUG-011). "I read your filter and it matched nothing" and "I could not read your filter" are different answers and now have different behaviour.

Covers `src`, `format`, `delimiter`, `root`, `orient`, `key-column`, `columns`, `where`, `sort`, `numeric`, `text` and `headers`.
