---
'@refrakt-md/runes': minor
'@refrakt-md/cli': minor
---

`refrakt reference` reports each rune's actual universal attributes (WORK-535)

`refrakt reference card` printed all 37 universal attributes under the heading **"Universal attributes (available on every rune)"**. On most runes several of them do nothing — the CLI stated as fact something false about the rune it was describing, which is the symptom that opened SPEC-125. Unlike language-server completion, this did not fall out of the schema narrowing for free: the line was a separate code path printing the static universal set wholesale.

Each rune now reports what it carries, and names the reason for what it does not:

```
Universal attributes: tint, tint-mode, bg, width, spacing, inset, elevation, reveal, …
Not applicable to this rune:
  - dropcap, reading: this rune declares no body section
  - prominence: this rune has no page-section header
```

51 of the 55 runes in this repo's reference had at least one false claim before.

**Explaining, not just omitting.** The alternative was to let an inapplicable attribute vanish silently, which matches the schema and is simpler. But reference output is a teaching surface — it is what `create-refrakt` writes into `AGENTS.md` for coding agents — and "why is `reading` on `textblock` but not on `grid`?" is exactly the question a bare omission leaves unanswered.

**The schema stays authoritative.** Availability is read off the rune's own attribute list; the applicability rule is consulted only to explain an absence, and an axis the schema carries is never reported unavailable whatever the rule says. A tool that contradicted the rune it describes is the bug being fixed, so the reconciliation is pinned by a test across every core rune rather than left implicit.

`--format json` gains `attributes.universalUnavailable` (`{ axis, reason, attributes }[]`) alongside the existing narrowed `attributes.universal`, so machine consumers get the same answer as the human output. The hoisted **Universal Attributes** section in `reference dump` now reads as the shared vocabulary rather than a blanket promise.

No theme config is loaded to produce any of it. `ReferenceContext` carries schemas, not configs — the right shape, because applicability is rune identity (ADR-028). The posture that explains an inline rune's absences (`badge` is inline; a structural reason would be true and beside the point) is recorded on the schema at construction, next to the join tables that answer the same question.
