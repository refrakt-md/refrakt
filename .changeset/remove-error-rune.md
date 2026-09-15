---
"@refrakt-md/runes": minor
---

Remove the `error` rune (WORK-555)

`{% error %}` is gone. It was a leftover from refrakt's predecessor: a schema
that took a Markdoc `ValidationError` and emitted a bare `<tr>` of four `<td>`s.
Nothing in this repo has ever constructed it, in any version.

It was not merely dead weight — it was a live crash. `runeTagMap` applies no
internal filter, so the tag was author-writable and appeared in
`refrakt inspect --list` and in language-server completion as "Error reporting
table". It declares no required attributes and its transform dereferences
immediately:

```ts
const err = attrs.error as ValidationError;
const code = new Tag('td', {}, [err.id]);
```

`createContentModelSchema` calls `transform` with no `try`/`catch`, so an author
who found `error` in autocomplete and wrote `{% error /%}` got
`Cannot read properties of undefined (reading 'id')` and a dead build.

It also sat outside every convention the project has since built: no engine
config entry, no BEM block, no CSS in Lumina, no structure contract, no doc
page, no fixture. It was invisible to every convention and visible in every
autocomplete.

**Breaking in name only.** Removing a catalogued rune is nominally breaking, but
no user can have had a working `{% error %}` — writing it crashed the build. The
affected set is provably empty.

`nodes.error` is untouched. That is Markdoc's built-in parse-error node and is
unrelated to this rune.

The exception lists shrink with it: `'error'` is dropped from `EXCLUDED_RUNES`
in `reference.ts` and from `PAGELESS` in `check-rune-docs.mjs`, rather than
being left behind as a suppression for something that no longer exists.
