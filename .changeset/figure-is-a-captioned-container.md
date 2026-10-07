---
'@refrakt-md/runes': patch
'@refrakt-md/lumina': patch
'@refrakt-md/skeleton': patch
'@refrakt-md/cli': patch
---

`{% figure %}` keeps everything in its body and captions it (BUG-028)

A figure used to emit only its images and its caption. Any other child, such as
a fenced code block, a table, a nested rune, or a second paragraph, was
transformed and then dropped without a warning, so a figure wrapping a code
block rendered a caption under nothing. Figure is now a general captioned
container. Every child is kept in the order it was written. Media (an image, a
video, a `placeholder:` or `icon:` image) is still the figure's media slot and
is unwrapped from its paragraph as before. The caption still comes from the
`caption` attribute or the first paragraph without an image, and still renders
last. A figure holding only images renders exactly as it did.

The structured data follows the content. A figure whose body is only media is
still an `ImageObject` with `contentUrl` and `caption`. A figure holding
anything else now publishes no schema.org type and no properties, where it used
to claim `ImageObject` regardless, even with no image in it. Calling a captioned
code block an image was a false statement in the page's JSON-LD and RDFa.

The rule lives in figure's schema table. Tables gain `byField`, which selects a
row from a value the rune's transform records in its field bag, for a type that
depends on what the content is rather than on an attribute. `refrakt inspect`,
`refrakt contracts` and `refrakt reference` show it.

Lumina's and the skeleton's figure image and caption rules now apply only to the
figure's own children. An image inside a nested rune in a figure body keeps its
own styling.
