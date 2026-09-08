---
'@refrakt-md/storytelling': minor
---

Correct missing section roles on the storytelling entity and section runes (SPEC-125 Phase 1)

Six runes in two families of three, each family resolving the same way across its siblings.

**`character`, `realm`, `faction`** gain a `body` role. All three share one shape — a `preamble` header holding `name`, a media slot, and a `body` slot the `sections` map never mapped — so `reading` and `dropcap` were silently dropped on all three. Their header roles were already correct, so `prominence` already worked; only `body` was missing.

**`character-section`, `realm-section`, `faction-section`** gain a `body` role on their prose, and deliberately gain **no** header-ish role. The entity's own `name` already holds `title`; a second `title` inside the same subtree would flatten the very hierarchy `prominence` exists to scale, and Lumina pins `.rf-{block}__name`'s type outright, so the role would be inert there in any case. The contract keeps recording `prominence` as unavailable on these three, which is the honest answer.

**Rendered output changes**: the six runes now emit `data-section="body"` on those slots. Checked in a browser against the real stylesheet — including the `realm` case where the new body role sits beside an existing `media` role — every element's computed style and box geometry is unchanged. `[data-section="body"]`'s declarations are already the values inherited from `html`, and none of the six stylesheets sets `line-height` or `color` on its body element. A theme with its own `[data-section]` rules may see a change; that is the intended, visible half of the correction.

Note: `character`'s entity-level body slot is currently always empty — prose written directly inside `{% character %}` is dropped by its content model, unlike `realm` and `faction`, which handle the same input correctly. The role is declared correctly here; the content-model defect is tracked separately as BUG-003.
