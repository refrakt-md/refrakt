{% work id="WORK-537" status="ready" priority="medium" complexity="moderate" source="SPEC-125" tags="runes,facets,schema,reading,breaking" milestone="v0.32.0" %}

# Separate the prose capability from the body role

`body` carries two meanings that were merged by accident of timing:

- **Structural** — "the rune's main content region". Its original purpose,
  consumed by Lumina's `styles/dimensions/sections.css:42` and
  `styles/dimensions/density.css:45`.
- **Editorial** — "prose that a reading register applies to". Added later by
  {% ref "SPEC-108" /%}, which reused the existing structural declaration as a
  *proxy* for a capability it never declared.

The proxy holds for most of the 21 runes with a `body` role and breaks for a real
minority. Without this, {% ref "WORK-534" /%} would offer `reading` and `dropcap`
on `DataTable` — so `{% datatable reading="prose" dropcap=true %}` would validate
and stamp a drop cap onto a table.

**Removing the role is not the fix.** DataTable's table genuinely *is* the rune's
main content region and Lumina styles that role; dropping it would change how the
rune renders for a reason unrelated to rendering.

## Shape

Declare the gate rather than inferring it, per {% ref "SPEC-125" /%}'s governing
rule:

```ts
readingAxis.requires = 'prose'
TextBlock: { provides: ['prose'] }
```

Only one axis needs it initially, so this is close to a bespoke field in cost. It
is worth the general shape because {% ref "SPEC-124" /%} already gave every facet
a declaration point — `requires` sits beside `contract` and `describeForRune`,
and flows into the structure contract for free. A bespoke `proseSection` on
`RuneConfig` solves the same case and leaves the next axis to invent its own.

## Acceptance Criteria

- [ ] `reading` and `dropcap` gate on a declared prose capability, not on the
      `body` role
- [ ] The capability is declared by the facet and provided by the rune, so the
      next axis needing one does not invent a bespoke field
- [ ] The structural `body` role and every stylesheet keying on
      `[data-section="body"]` are unchanged
- [ ] The 32 body-role runes are audited for whether they bear authored prose
- [ ] `DataTable`, `Showcase`, `Form`, `Api` and `Symbol` no longer offer
      `reading`/`dropcap`; `Blog`, `TextBlock`, `PullQuote`, `Sidenote` and `Lore`
      still do
- [ ] The structure contract's `unavailable` reasons reflect the new gate rather
      than still citing the body role
- [ ] A breaking changeset records the runes that lose the attributes
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Scope grew in v0.31.0 — the audit list, not the answer

The criteria above said "~21" when this item was written. Phase 1 added a `body`
role to twelve more runes, so the audit covers **32**:

`AccordionItem`, `Annotate`, `Api`, `BentoCell`, `Blog`, `Bond`, `Bug`, `Card`,
`Character`, `CharacterSection`, `DataTable`, `Decision`, `Drawer`, `Event`,
`Faction`, `FactionSection`, `Form`, `ItineraryStop`, `Lore`, `MediaText`,
`Milestone`, `Organization`, `Playlist`, `PullQuote`, `Realm`, `RealmSection`,
`Showcase`, `Sidenote`, `Spec`, `Symbol`, `TextBlock`, `Work`.

**The expected non-provider list is unchanged.** All twelve additions are
prose-bearing regions — a card's body, a bento cell's body, an accordion
answer, a storytelling entity's or section's prose, an itinerary stop's note,
the prose after a playlist's track list — so `DataTable`, `Showcase`, `Form`,
`Api` and `Symbol` remain the five expected to lose `reading`/`dropcap`. The
larger number is more runes to confirm, not more exceptions to find.

One caveat on `Character`: its body role is correct but its slot is **always
empty** — prose written directly inside `{% character %}` is dropped by its
content model ({% ref "BUG-003" /%}). It provides prose in principle and none in
practice until that is fixed; audit it on the intent, not on the current output.

## Approach

**Sequenced after {% ref "WORK-534" /%}, and the order is load-bearing.** The
design question is the default:

- **Default-on** (a `body` role implies prose unless a rune opts out) keeps the
  migration tiny, but preserves the lossy proxy as the default — so this same bug
  recurs for the next non-prose rune.
- **Default-off** (a rune must declare that it bears prose) is honest, but a
  forgotten declaration silently disables `reading` — today's failure mode
  returning.

Default-off is right **only once schemas have narrowed**: with
{% ref "WORK-534" /%} in place a forgotten declaration is no longer silent — the
attribute is not offered and `refrakt reference` says so. Running this first would
forfeit that, so take default-off and rely on the narrowing to make omissions
discoverable.

Note `Playlist` may arrive here from {% ref "WORK-531" /%} with a newly-added
structural `body` role and no prose — that is the intended interaction between
the two items, not a conflict.

## Blocked by
- {% ref "WORK-534" /%}

## References

- {% ref "SPEC-125" /%} — Phase 4, and *The governing rule*
- {% ref "SPEC-108" /%} — where the proxy was introduced
- {% ref "SPEC-124" /%} — the facet declaration point this reuses

{% /work %}
