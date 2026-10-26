---
'@refrakt-md/runes': minor
'@refrakt-md/content': minor
---

`section`'s header is now anchored to its headline (ADR-046).

- **Content with no heading changes.** A section that does not start with a heading, or with one paragraph and then a heading, has no header: all of its content renders as body. Before this, its first paragraph was lifted into a `<header>` as the blurb. The site's own sections all start with a heading and render as before, but check third-party content that writes a `section` with paragraphs only, or an image and paragraphs.
- **Eyebrow and blurb exist only beside the headline.** An eyebrow is a paragraph directly before the heading, and a blurb a paragraph directly after it.
- **New `header` attribute** (`auto | headline | none`, default `auto`). `headline` lifts only a leading heading and keeps the paragraph after it in the body. `none` reads no header.
- **New `slot-header-role` warning.** A composed rune whose slot content a placed `section` reads as a header role the slot is not named for (for example a `description` slot read as the blurb) now gets a build warning. It names the rune, the slot, the role and both remedies. It is on by default, can be demoted with `validation.disableIds`, and changes nothing that renders.
