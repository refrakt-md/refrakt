---
'@refrakt-md/runes': minor
'@refrakt-md/transform': minor
---

**Breaking:** rune schemas now declare only the universal attributes that can affect them (WORK-534, SPEC-125 Phase 3)

`createContentModelSchema` merged all 37 universal attributes onto every rune unconditionally. Several are structurally inert on most runes: `reading` and `dropcap` need a body section role, `prominence` a header-ish one, the `frame*` family a media surface, the cover `scrim*` family a `media-position` modifier. Authoring tools read the schema, so they promised every attribute on every rune — and the engine then dropped the inapplicable ones, three of them in total silence.

Schemas are now narrowed at construction: 84 tags lost 1,651 attribute slots between them.

**What breaks.** Writing a gated attribute on a rune that cannot honour it moves from a silent no-op to a Markdoc validation error. `{% grid reading="prose" %}` used to build and do nothing; it now fails with `Invalid attribute: 'reading'`.

The break is narrower than it sounds, because the attribute never did anything in the first place — a build that starts failing was already not getting the behaviour it asked for. A scan of all 986 markdown files in this repo found 25 uses of a gated universal attribute in live content and **none** that a narrowed schema rejects. The five that would be rejected were all inside documentation code fences, and were corrected in 0.31.0. Downstream content the scan cannot see is what this note is for; the fix in every case is to delete the attribute, or to move it to a rune that has the structure it needs.

0.31.0 also removed the sharpest edge in advance: the runes an author is most likely to have written `reading` on were six whose section roles were missing, and those now honour it rather than rejecting it.

SPEC-125 had deferred the choice between narrowing outright and a transitional minor that annotates instead of rejecting. The numbers above decided it — a transitional release buys nothing and costs another minor of the silent no-op it exists to replace.

**Availability is now a declared rule, not a side effect of which constructor a schema used.** `resolveUniversalAttributes()` takes three inputs — the rune's posture (`auto` | `inline` | `configurator` | `none`, a new non-overridable `RuneConfig.universalAttributes` field), its own join tables, and the attributes it declares — and answers axis by axis. The six hand-written schemas that never carried universal attributes are each assessed and recorded: `badge`/`xref`/`icon` are inline, `tint`/`bg` supply an axis to their parent rather than carrying one, and `expand` is recorded as a legacy gap rather than passing as a decision.

**The schema and the structure contract cannot disagree**, because they are one derivation: both call `UniversalAxisFacet.describeForRune`, and a test compares the narrowed schemas against the contract's `unavailable` map across all paired runes in core and the nine plugins. That agreement is the point — an author told one thing by `refrakt reference` and another by Markdoc validation is the exact failure SPEC-125 exists to remove.

**Language-server completion narrows for free**, with no theme config loaded on the completion path — applicability is rune identity (ADR-028), answerable from the schema alone.

Transform output is unchanged. This changes what may be written, not what is emitted.
