{% work id="WORK-636" status="ready" priority="medium" complexity="moderate" source="SPEC-147" milestone="v0.41.0" tags="composition,storytelling,seo" %}

# `realm` and `faction` as composed runes

{% ref "SPEC-147" /%}: `realm` (`Place`) and `faction` (`Organization`) share `character`'s shape,
sections plus a preamble, and each has a `-section` child rune that composition removes. Their
media split maps to `{% mediatext %}`. Both follow {% ref "WORK-625" /%}'s pattern:

- beside the plugin (D1);
- compared against the registry snapshot and their SEO baseline fixtures, with every
  difference explained (D2);
- content written alongside sections renders, and no `data-field="section"` stamp is emitted
  (D6);
- role, type or scale metadata is placed with `{% metablock %}`, not with placed `badge` or
  `deflist` runes.

{% ref "SPEC-145" /%} D7's own worked example uses `realm`. Where the measured definition differs
from it, correct the spec, as WORK-630 did for `bond`.

If {% ref "WORK-631" /%} has landed, the definitions need no catch-all `body` field to keep
content. If it has not, they use one, as `character` does, and say so.

## Acceptance Criteria

- [ ] `realm` and `faction` are each defined as composed runes with their schema rows, `sections` placed with `each`, and their declared meta blocks placed with `{% metablock %}`
- [ ] Each one's JSON-LD is compared against its fixture's recorded output in `contracts/seo-baseline/baseline.json`, and every difference is explained (SPEC-147 D2)
- [ ] Each registers the same entity, id, data and aliases as the plugin's rune, asserted against the storytelling registry snapshot
- [ ] Content written alongside sections renders, and no `data-field="section"` is emitted (SPEC-147 D6)
- [ ] The media split uses `{% mediatext %}`, or the reason it cannot is recorded
- [ ] SPEC-145 D7's `realm` example matches the measured definition
- [ ] `plugins/storytelling/` is unchanged and still passing its own tests (SPEC-147 D1)

{% /work %}
