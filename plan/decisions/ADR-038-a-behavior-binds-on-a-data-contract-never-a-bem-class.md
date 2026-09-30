{% decision id="ADR-038" status="proposed" date="2026-09-30" source="SPEC-145" tags="behaviors, composition, theme, contracts, architecture, api-design" %}

# A behavior binds on a data contract, never a BEM class

## Context

`@refrakt-md/behaviors` scripts and custom elements find their host and their parts
with DOM selectors, and the repo contains two incompatible styles of doing it.

**The block-agnostic style**, which {% ref "SPEC-100" /%} states as a contract for
`carousel`:

> a host carrying `data-layout="carousel"` and a track container marked
> `data-name="items"` whose direct element children are the slides… The shared
> progressive-enhancement behavior binds on `[data-layout="carousel"]`
> (**block-agnostic**) and adds prev/next nav + keyboard scrolling… **Any rune
> emitting that shape gets the behavior for free — no per-rune behavior code.**

**The rune-specific style**, which `<rf-audio>` uses in three places
(`packages/behaviors/src/elements/audio.ts`):

```js
document.querySelectorAll('[typeof="MusicPlaylist"]');                    // :150
foundEl.querySelectorAll('li[data-rune="track"]');                        // :165
item.classList.toggle('rf-track--active', i === this.currentTrackIndex);  // :192
```

The rule already exists in practice for the third case and was never written down.
{% ref "WORK-065" /%} (`done`) migrated behaviors *"from class-based state toggling to
`data-state` attribute toggling… enabling themes to style all interactive states
generically"*, and `packages/lumina/styles/dimensions/state.css` ships
`[data-state="open" | "active" | "inactive" | "selected" | "disabled"]`. It enumerated
accordion, tabs, datatable and form. The audio player was not in the list and never
migrated, so it is the only behavior still writing a BEM state class — and Lumina's
`audio.css:145` reaches into `.rf-track--active` to style it.

### What forces the decision

{% ref "SPEC-145" /%} D2: **a composed rune has no block.** So a behavior that reads or
writes a BEM class cannot drive a composed rune — not by oversight but by construction,
and silently, because a selector that matches nothing throws nothing.

That also answers an open premise SPEC-145 carried as unverified — *whether
behaviour-driven primitives bind correctly when placed by a template.* The answer is not
one answer: it depends entirely on which of the two styles the behavior uses. A
block-agnostic behavior works under composition today. A rune-specific one never will.

{% ref "SPEC-155" /%} is where this became concrete: `playlist` is composable on every
other axis, and the player is the thing that would break.

## Decision

Three rules, governing every behavior and custom element in `@refrakt-md/behaviors` and
in plugins.

### 1. A behavior finds its host and its parts by contract attributes

`data-layout`, `data-name`, `data-state`, `data-section` — attributes that name **what
the node is for**. Never `data-rune`, never `typeof`, never a class.

`typeof` is the sharpest case and worth stating separately: it is a **published SEO
output, derived from content**, not a hook. {% ref "BUG-013" /%}'s fix made a playlist's
`typeof` follow the author's `type` attribute, which silently reduced
`[typeof="MusicPlaylist"]` from matching every playlist to matching one of five kinds.
A selector on `typeof` couples runtime behaviour to a schema.org decision, and schema
decisions are expected to change as mappings are corrected.

### 2. Runtime state is written as `data-state`, and styled as `[data-state]`

{% ref "WORK-065" /%}'s convention, stated as a rule so the next behavior does not have
to rediscover it. A theme styles state generically; a behavior never invents a class.

### 3. Interactive chrome is emitted by whatever binds it

A play button, a prev/next control, a disclosure toggle: the code that attaches the
handler emits the element. A control rendered by something that cannot bind it is a
control that does nothing when JavaScript fails or errors, which is worse than its
absence.

This is a constraint on **templates**, not on the engine. The engine's `structure` config
may inject chrome declaratively, because engine and behavior ship together as first-party
code under one review. A {% ref "SPEC-145" /%} template may fabricate *content* — D8
establishes that and it stands — but not an affordance whose handler lives elsewhere.

## Consequences

**Composed runes can be interactive, without a component and without CSS of their own.**
This is the consequence worth the decision. Under rule 1 a composed rune participates by
emitting the contract shape; under rule 2 its state is styleable by a theme that has never
heard of it. That matters specifically for {% ref "ADR-037" /%}'s audience: a user's
composed rune cannot be styled by name, so a generic state and binding contract is the
only route it has.

**`<rf-audio>` is the one non-conforming behavior, and its migration is three changes.**
Find the playlist by a contract attribute rather than `typeof`; find track items by one
marker that both authored and generated tracks carry; write `data-state` instead of
`rf-track--active`. The first two are defects today, independently of composition
({% ref "SPEC-155" /%} records them measured), and the third is {% ref "WORK-065" /%}'s
unfinished coverage.

**A behavior contract is a published interface.** `carousel` already shows the shape —
host attribute, part markers, documented in the spec that introduced it. New behaviors owe
the same, because a user-authored template is now a possible client and it cannot read the
behavior's source to find out what to emit.

**This does not authorise a behavior vocabulary.** Naming contracts is cheap and
mechanism is expensive, exactly as {% ref "ADR-030" /%} rule 6 argues for arrangements.
This decision constrains how a behavior binds; it does not propose a set of behaviors, and
{% ref "ADR-036" /%}'s plugin escape hatch still covers anything needing a real component.

**Rule 3 costs a composed rune some affordances, and that is the right trade.** A composed
playlist cannot place its own per-track play buttons. It does not need to: `<rf-audio>`
already injects its whole player UI, and per-item controls belong in the same place.

## Alternatives considered

**Let a composed rune declare a block after all, so BEM-coupled behaviors reach it.**
Rejected — that is {% ref "SPEC-145" /%} D2, and D2 is what keeps untrusted CSS out of the
hosted story entirely. Reopening it to accommodate one player's selectors is the tail
wagging the dog.

**Register a behavior per composition.** Rejected: a composition that ships JavaScript is
a plugin, which {% ref "ADR-036" /%} already routes. The point of composition is that it
ships neither code nor CSS.

**Leave `<rf-audio>` as it is and exclude `playlist` from composition.** Rejected on two
grounds. Two of its three couplings are defects that need fixing regardless — one a
regression — and the third is owed to {% ref "WORK-065" /%} whether or not `playlist` is
ever composed. Excluding the rune would preserve the bugs and call them a boundary.

**State the rule only for state (rule 2) and leave binding to judgement.** Rejected: the
binding half is where the silence bites. A missing state class looks like a styling bug and
gets found; a selector that matches no host produces a player with an empty queue, which
looks like a player.

## References

- {% ref "SPEC-145" /%} — composed runes; D2's no-block rule is what makes this load-bearing, and D8's fabrication limit is what rule 3 bounds
- {% ref "SPEC-155" /%} — the media audit; the three measured `<rf-audio>` couplings
- {% ref "SPEC-100" /%} — the `carousel` contract; the block-agnostic style this generalises
- {% ref "WORK-065" /%} — the `data-state` migration whose convention rule 2 states and whose coverage this completes
- {% ref "BUG-013" /%} — why a `typeof` selector is coupled to a schema decision
- {% ref "ADR-037" /%} — users author composed runes only; the audience that needs generic contracts
- {% ref "ADR-030" /%} — arrangements; rule 6's cheap-vocabulary / expensive-mechanism split, applied here
- {% ref "ADR-036" /%} — name the pattern, do not open a language; the plugin route for anything needing a component

{% /decision %}
