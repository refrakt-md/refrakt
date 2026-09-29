{% decision id="ADR-037" status="proposed" date="2026-09-29" source="SPEC-145" tags="runes, composition, hosted, dx, api-design, css" %}

# Users author composed runes only

## Context

Two mechanisms came out of the same design conversation. {% ref "SPEC-143" /%} lets a
rune declare its slots instead of writing a `transform`, emitting its own BEM block.
{% ref "SPEC-145" /%} lets a rune place its content into other runes with a Markdoc
template, emitting no block of its own. Both were drafted as *authoring tiers*, with
a table telling an author which to reach for.

Presented with that table, the obvious objection is that two ways to author a rune is
one too many — and it is correct, for a reason the tier framing obscured.

**The tiers share their entire declaration half.** The composed `realm` example in
SPEC-145 D7 declares `attributes`, `content`, `schema`, `metaFields`, `blocks` and
`registers` — every one of them a SPEC-143 or {% ref "SPEC-144" /%} declaration. The
two paths do not differ in how a rune is declared. They differ only in what fills the
**output** half: a slot declaration plus a block, or a template.

So there was never a second authoring system. There is one declaration and two emit
paths, and the real question is which emit paths a user gets.

## Decision

**Users author composed runes. The declared emit path is internal — it is how
first-party runes shed their imperative transforms, not an authoring mode offered to
anyone outside this repo.** A user who needs more than composition writes a plugin,
which is the graduation path {% ref "ADR-036" /%} already documents.

The deciding axis is **who owns arrangement**:

| Emit path | Arrangement decided by | Portability |
|---|---|---|
| Declared (internal) | the theme, via `layout` | Full {% ref "ADR-028" /%} strength — each theme arranges the labelled parts |
| Composed (user-facing) | the rune author, in the template | Appearance follows the theme; arrangement does not |

A user defining a domain type — `wine-tasting-note`, `property-listing`, `case-study`
— runs one site with one theme. Cross-theme structural portability is a benefit they
cannot cash, so the declared path's principal advantage is worthless to precisely the
audience it was being offered to.

The catalog supports this empirically. Of 126 runes, nearly every domain rune is
structurally a card / section / deflist / details shape, which composition reaches.
The genuinely novel visual forms — `storyboard`, `map`, `chart`, `juxtapose`,
`gallery` — need behaviors or external integration, so they need a plugin regardless.
The declared path's unique niche for a user is therefore "a novel *static* visual form
with no interactivity": real, but narrow, and already routed to a plugin.

## Consequences

**The CSS problem for rune authors disappears.** This is the largest consequence and
the reason this decision is worth making early. A declared rune with no styles renders
unstyled, which SPEC-143 identifies as the sharpest authoring barrier — and which
dragged in a `style` fence, sanitisation of untrusted CSS, a scope assertion over
author selectors, and the question of what a skin file contains. A composed rune ships
no CSS at all (SPEC-145 D2). None of that applies to a rune author any more.

{% ref "ADR-035" /%} is **unaffected**: skin files target *theme* authors, a different
audience with a different job. The scope of the skin format does not change; only the
claim that rune authors would use one goes away.

**The hosted validation surface barely grows.** A user rune becomes frontmatter plus a
Markdoc template. Markdoc is already parsed and already safe. What remains is the
schema.org claims question (SPEC-143's open question) and `itemModel`'s regex
(ADR-036's one exception) — both already recorded, neither made worse by this.

**SPEC-143 is unchanged in substance and clearer in purpose.** Its job was always
removing ~135 imperative transforms from this repo; every acceptance criterion is a
first-party migration. Its role becomes "the internal emit path, and the foundation the
shared declaration rests on", which is more defensible than being one of two options a
user picks between.

**A user's composed rune keeps its arrangement across a theme change.** Appearance
follows the theme, because the primitives are themed; arrangement does not, because it
is in the template. That is a reasonable contract for someone who wrote a template, and
it belongs in the authoring documentation rather than being discovered.

**A composed rune is a poor basis for a redistributable rune package.** Anyone wanting
`@acme/wine-runes` to work under any theme is constrained by a baked arrangement — and
is writing a plugin anyway, so the constraint bites only if they try to avoid that.

**D5's mutual exclusion still holds**, and gains a second job: it is now also the line
between the internal and user-facing paths, so a user definition carrying a slot
declaration instead of a template is rejected rather than quietly accepted.

## Alternatives considered

**Offer both tiers, with documentation explaining when to use which.** Rejected — this
is what prompted the objection. The choice is not one an author is equipped to make on
first contact, the two differ on an axis (who owns arrangement) that only matters to
people shipping across themes, and every user-facing declared rune drags the entire CSS
sanitisation problem back in.

**Offer only the declared path, and keep composition internal.** Rejected on the
opposite grounds: the declared path costs a user the authoring barrier that matters most
(their rune renders unstyled until they write CSS), and it hands them portability they
have no use for.

**Collapse the two into one mechanism.** Rejected: they are genuinely different in what
they emit, and the declared path is load-bearing for first-party runes precisely because
a theme must be able to rearrange `work`, `character` and the rest. Removing it would
trade SPEC-143's whole payoff for symmetry.

**Let users write plugins only, with no rune definitions at all.** Rejected: that is
today's situation, and it is the gap a hosted refrakt cannot ship around — no plugin
authoring inside a hosted renderer means no domain coverage beyond what ships.

## Checked while scoping

- SPEC-145 D7's composed `realm` example — the declaration half is entirely SPEC-143 /
  SPEC-144 vocabulary, which is what revealed there is one declaration rather than two
- `npx refrakt inspect --list --site main` — 126 runes; the structural survey behind the
  "nearly every domain rune is a familiar shape" claim
- `packages/behaviors/src/index.ts` — which runes need behaviors, and therefore a plugin
- `packages/transform/src/identity-fields.ts` — ADR-028's guarded fields, the portability
  premise the arrangement axis turns on

## References

- {% ref "SPEC-145" /%} — composed runes; the user-facing emit path
- {% ref "SPEC-143" /%} — declarative slot labelling; the internal emit path and the shared declaration
- {% ref "SPEC-144" /%} — entity and edge registration; part of the shared declaration half
- {% ref "ADR-036" /%} — name the pattern, do not open a language; owns the plugin graduation path
- {% ref "ADR-035" /%} — the skin format, which targets theme authors and is untouched by this
- {% ref "ADR-028" /%} — a theme restructures a rune, never redefines it; the portability premise

{% /decision %}
