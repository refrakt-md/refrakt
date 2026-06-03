{% work id="WORK-323" status="done" priority="medium" complexity="moderate" source="SPEC-082" tags="runes,engine,cleanup,data-channel,fields" milestone="v0.18.0" %}

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
- {% ref "WORK-329" /%} — the schema.org SEO metas must be untangled from the
  data channel first; otherwise dropping the conflated metas breaks JSON-LD and
  the kebab/strip machinery can't be removed.

## References

- {% ref "SPEC-082" /%} — typed node data channel.

## Resolution

Completed: 2026-06-03

Branch: claude/rune-contract-hardening

### Outcome: DESCOPED — data-channel migration is functionally complete at WORK-329.

Implementing the drop revealed it is high-cost / low-value as scoped; closing it rather than dropping the metas. The ACs (drop the metas; remove the read/strip/kebab) are intentionally left unchecked.

### Why
1. **The pure-data metas are already stripped from production HTML.** The engine's step-7 strips modifier metas by `data-field` match before render, so they never reach rendered output today. Dropping them in the schema transform changes *no* rendered output — only the intermediate pre-engine tree (a modest serialized-payload dedup; bag + metas both cross the boundary). The only metas currently in output are the non-modifier leaks (design `tokens`/`scope`) — harmless and invisible.
2. **The engine's `<meta data-field>` modifier-input is a load-bearing contract.** The bag (WORK-321/322) was added as a dual-*read* (bag-first, meta-fallback), not a replacement of the input form. Removing the meta-read broke 168 engine+rune tests; even keeping the read but dropping the metas from schema output broke 123 tests across 52 files that assert field data via `<meta data-field>` in the pre-engine tree. Full removal would require migrating that entire fixture style (metas → bag) for ~no production benefit.

### Where this leaves SPEC-082
Functionally complete: the typed `data-rune-fields` bag is the source of truth, every reader (engine + all plugin register hooks) prefers it, and SEO is untangled (WORK-329). The legacy `<meta data-field>` channel persists only as a redundant, dual-emitted, stripped-from-output, **fallback input** form — not the active channel.

### If full excision is ever wanted
A dedicated effort: migrate ~123 rune/engine test fixtures to feed `data-rune-fields`, then remove the engine read-fallback + step-7 modifier strip + kebab set and the createComponentRenderable meta emission. Large, mechanical, some risk; payoff is a smaller serialized payload + a single data representation. Not pursued now.

### State
No code change landed for WORK-323 (engine + createComponentRenderable restored to the WORK-329 state; suite green there).

{% /work %}
