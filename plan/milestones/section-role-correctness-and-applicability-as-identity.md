{% milestone name="v0.31.0" status="planning" %}

# v0.31.0 — Section-role correctness and applicability as identity

The first half of {% ref "SPEC-125" /%}, governed by {% ref "ADR-028" /%}:
correct the section-role data, and make attribute applicability a rune-structural
fact that a theme cannot change.

Nothing here breaks a build. The user-visible outcome is that `reading` and
`dropcap` start working on runes where they were silently dropped — most
obviously `card`, whose content model is literally "`body` (optional, repeatable
any block)" but whose `sections` map never declared the role.

The half that *does* break — narrowing schemas so an inapplicable attribute is
rejected rather than ignored — is {% ref "v0.32.0" /%}.

## Why this is a minor

Phase 1 changes rendered HTML on ~10 runes: declaring a section role adds
`data-section`, which Lumina styles directly in `styles/dimensions/sections.css`
and `styles/dimensions/density.css`. No build fails, but existing sites will
render those runes differently without doing anything. Pre-1.0, caret ranges only
allow patch updates (see `RELEASING.md`), so a minor is the right compatibility
boundary for a visible change.

## Shape

**Phase 1 — audit and correct the section-role data.** Six runes declare a `body`
slot but never map it to the `body` role — `Card`, `BentoCell`, `Character`,
`Realm`, `Faction`, `Playlist` — and six declare a title/header slot with no
header-ish role — `AccordionItem`, `BentoCell`, `CharacterSection`,
`RealmSection`, `FactionSection`, `ItineraryDay`. The remaining 105 runes with
neither are genuinely bodyless and must be left alone.

Each needs a per-rune judgement, and each is a visible output change, so each
carries its own justification and test. A lint lands with them so the drift
cannot recur.

**Phase 2 — lock applicability as rune identity.** Two parts:

- Extend the `IDENTITY_FIELDS` guard in `packages/transform/src/validate.ts` —
  today enforced only against {% ref "SPEC-091" /%} variant deltas — to the theme
  override path in `mergeRuneConfig`. Expected to be a no-op in practice, so it
  is independently landable and a good first commit.
- Move the join tables (`sections`, `mediaSlots`) and `frameTarget` into their tag
  modules, with config referencing them. The engine's read path is unchanged.

## Sequencing

Phases 1 and 2 are grouped into one release **because they touch the same files**.
Phase 1 corrects `sections` values across ~50 rune configs; Phase 2 moves those
same declarations into tag modules. Splitting them across releases would mean two
passes over the same ~50 places for no benefit.

Within the milestone the identity guard can land first and alone — it depends on
nothing and unblocks the argument for everything after it.

## Deliberately deferred

Separating the prose capability from the `body` role is **not** in this
milestone, even though the `DataTable` and `Showcase` cases surfaced alongside
the Phase 1 audit. Those roles are correct — `body` is simply overloaded, and
Lumina styles it — so the fix is a design change, not a data change, and its
central question (default-on vs default-off) is only answerable once schemas have
narrowed. It is Phase 4, in {% ref "v0.32.0" /%}.

## References

- {% ref "SPEC-125" /%} — the spec
- {% ref "ADR-028" /%} — applicability is rune identity, not theme configuration

{% /milestone %}
