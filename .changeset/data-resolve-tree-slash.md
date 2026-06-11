---
"@refrakt-md/runes": patch
---

Fix the `tree` shape of a data-bound sandbox: page entity `url`s carry no trailing slash while `parentUrl`s do, so the nesting never matched and the tree came out flat. Normalize trailing slashes when building the tree so parent↔child relationships resolve.
