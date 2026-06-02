{% work id="WORK-323" status="ready" priority="medium" complexity="moderate" source="SPEC-082" tags="runes,engine,cleanup,data-channel,fields" milestone="v0.18.0" %}

# Drop data-field metas; delete the side-channel cruft

Step 3 of {% ref "SPEC-082" /%} — the payoff. Stop emitting `<meta data-field>`;
the engine reads only `data-rune-fields` (parse once, strip the reserved key
before output). Delete the legacy meta-read path, the meta-strip filter, the
kebab-matching set, and the unconsumed-meta leak filter. Genuine schema.org /
SEO `<meta property>` tags are untouched.

## Acceptance Criteria

- [ ] Schemas stop emitting `<meta data-field>` (SEO `<meta property>` remain).
- [ ] The engine reads field data only from `data-rune-fields`, and strips the
  reserved key before the tree reaches any renderer.
- [ ] Removed: the legacy `readMeta`-as-data path, the meta-strip filter, the
  kebab-matching set, and the unconsumed-meta leak filter.
- [ ] `refrakt inspect` and the block editor read field values from `fields`;
  `inspect --json` surfaces the parsed object.
- [ ] Rendered output unchanged; full suite + both structure contracts green.

## Notes

- The optional SPEC-082 step 4 (promoting `fields` to a first-class top-level
  node field via `serialize()`, behind the boundary edits) is **out of scope**
  here — file a follow-up only if a typed top-level slot proves worth it.

## Dependencies

- {% ref "WORK-322" /%} — the engine must already dual-read before the legacy
  channel can be removed.
- {% ref "WORK-328" /%} — the pre-engine field consumers (SEO + plugin
  register hooks) must read the bag first; otherwise dropping the metas breaks
  entity registration and SEO.

## References

- {% ref "SPEC-082" /%} — typed node data channel.

{% /work %}
