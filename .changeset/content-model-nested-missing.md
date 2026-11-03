---
'@refrakt-md/types': minor
'@refrakt-md/runes': minor
'@refrakt-md/content': minor
---

Two more SPEC-186 content-model constructs.

- **Nested models (D2).** A field that matches one block node (`blockquote`, or a child rune) may declare `model`: a `sequence` read over that node's children.
  - The field still takes the whole node. Its members resolve under dotted names (`quote.attribution`), to any depth.
  - A composition places the node whole or its members by dotted name, not both (`nested-placed-twice`). A nested model on any other field is rejected (`content-nested-invalid`).
  - A child the nested model does not read is reported `content-unmatched`, naming the field.
- **`content-missing` (D4).** A required field, group or nested member that took no node is now reported as `content-missing`, naming the field and the rune. This includes a required field reached after the content ran out, which used to pass silently. It is a warning in this release.
- **Behaviour change:** a child that a required field skips is no longer dropped. It stays for the next field and is reported `content-unmatched` only if nothing takes it, so a finding names the real problem. A sweep of every site and fixture found no instance.
