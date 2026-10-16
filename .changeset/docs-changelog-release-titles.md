---
'@refrakt-md/docs': minor
---

A changelog release can have a title. Write it after the version, separated by a middle dot: `## v0.41.0 · Composed runes you can ship - October 9, 2026`. The title renders inside the release heading, after the version, as a `title` element, and `{% changelog-release %}` takes a matching `title` attribute. After a title, the dash before the date needs a space on each side, so a title may contain a hyphen but not ` - `. Headings without a title parse exactly as before.

An undated heading such as `## v0.41.1` now drops its leading `v` like a dated one always did, so every release shows its version the same way.

The changelog no longer has a surface: its default elevation is `flush` instead of `flat`, so it renders as page content with each release's divider, without a filled, bordered box around the whole list. Set `elevation="flat"` on the rune to keep the old look.
