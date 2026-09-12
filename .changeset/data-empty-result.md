---
"@refrakt-md/runes": patch
---

`{% data %}`: an empty filter result is no longer a build error (BUG-011)

A `where` that is correct and simply matches nothing rendered a caution callout reading *"result is empty after projection"*. Asking real data a question with no answer today is normal — a page listing open bugs when there are none is working, not broken.

The check could not just be removed, because it was the only thing catching a **misspelt column**: `where="regio:North"` matched no rows, and nothing reported the typo. One signal was standing in for two conditions, so it was wrong about one of them.

The three conditions now have three signals:

- **A source that yielded no rows** — an empty file, or a `root` / `orient` pointing at nothing — stays a build **error**, with a message about where to look.
- **A `where`, `sort`, or `columns` clause naming a column the source does not have** is a new build **warning** that names the column and lists the ones that exist. It fires whether or not the result ends up empty, since a clause that matches nothing is a mistake even when another clause still returns rows.
- **A filter that legitimately matched nothing** renders nothing, silently.

```
data "revenue.csv": `where` names a column the source does not have: "regio". Available: region, quarter, revenue.
```

This is what makes a shared block of `{% data %}` queries practical: a section that has nothing to say now disappears instead of reporting a failure.
