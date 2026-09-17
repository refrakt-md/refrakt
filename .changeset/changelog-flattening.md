---
"@refrakt-md/runes": patch
---

Fix the changelog generator mangling wrapped bullets and tables

`scripts/generate-changelog.mjs` flattens each package CHANGELOG into the prose
summary at `site/content/releases.md`. Two shapes did not survive the flattening:

- **A sub-bullet that wraps** had its continuation lines classified as prose, so
  every bullet was truncated at its first line and the orphaned tails were joined
  into a single sentence. v0.34.0's entry for the three validation defects reads
  as three unrelated half-thoughts run together, and every release back to
  v0.30.1 has instances of it.
- **A markdown table** was unwrapped into one line of pipes and dashes.

Continuation lines now attach to the bullet above them, and tables are dropped
the way fenced code blocks already are — the changelog is a flat prose summary
and a table has no flat form, so the readable choice is to leave it in the
package CHANGELOG and say the same thing in a sentence.

`releases.md` is regenerated here, which repairs the existing entries: 68
releases unchanged, fourteen garbled lines gone, nothing else moved.
