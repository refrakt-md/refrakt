{% spec id="SPEC-145" status="draft" tags="runes, composition, markdoc, seo, hosted, architecture" %}

# Composed runes

## Summary

A rune defined not by declaring its own output but by placing its authored content
into slots of existing primitive runes, with a Markdoc template. It has no BEM
block and ships no CSS: its appearance is whatever the installed theme already
gives the primitives it is built from. It does carry its own identity — a
`data-rune`, a schema.org row, and optionally a
{% ref "SPEC-144" /%} registration — so the tree it produces means the domain type,
not the primitives.

This is the second of two authoring tiers. {% ref "SPEC-143" /%} covers a
genuinely new atom that needs its own block and styles; this covers a domain type
that is structurally a familiar shape, which is most of them.

## Background — why this is the pressure valve

A hosted refrakt cannot ship a plugin per domain, so users define runes. The
temptation at every expressive gap is a richer language in the definition file;
{% ref "ADR-036" /%} rules that out and names composition as the alternative. This
spec is that alternative.

The tier split falls out of what each tier can and cannot do:

| | Declared rune ({% ref "SPEC-143" /%}) | Composed rune (this spec) |
|---|---|---|
| Output | Own block, own BEM classes | The primitives' blocks |
| CSS | Ships in a skin file ({% ref "ADR-035" /%}) | **None needed** — inherits the theme's |
| Fits | A new atom with no precedent | A domain type shaped like something that exists |
| Contract | Derived from config, as today | Derived by expanding the composition |

The CSS column is the important one. "A declaratively-defined rune renders
unstyled" is the sharpest authoring barrier {% ref "SPEC-143" /%} identifies, and
composition dissolves it rather than solving it: there is no new block to style.

## The mechanism mostly exists

`{% include %}` (`packages/runes/src/tags/include.ts`, SPEC-129) splices a file's
parsed AST into the page during **preprocess**, ahead of every other preprocess
step, and substitutes `variables` bindings at paste time. Its own doc comment is
explicit that this is substitution rather than a transform-time scope, "so bound
values reach preprocessor attributes such as `{% data where=$q %}`".

That is the right machinery, for a reason worth stating: because the splice happens
before `Markdoc.transform`, the primitives' own transforms then run on the spliced
tree exactly as if the author had typed it. No special-casing, no second code path,
and SPEC-129 already settled the ordering problem a preprocessor inside a pasted
file creates.

Three things are missing.

**1. Content slots, not just scalar variables.** `variables={q: "rune:card"}` binds
strings. Composition needs to place authored *subtrees* into named positions — the
body a user wrote under `{% character %}` has to land inside the template's
`{% card %}`. That is substitution over node lists rather than over strings.

**2. An outer identity.** After the splice the tree is the primitives': it carries
`data-rune="card"`, and the cross-page pipeline, `extractTitle`, breadcrumbs and
the editor all see a card. The composition needs a wrapper carrying the composed
rune's own `data-rune`, with the inner runes demoted to implementation detail.

**3. Cycle detection.** A composes B composes A. Cheap to detect, easy to omit.

## SEO works, and the mechanism is already there

The obvious worry is that a composed rune cannot make a coherent structured-data
claim, because its output is other runes' nodes carrying other runes' types. That
worry is unfounded, and the reason is a principle the codebase already
implements for a different purpose.

`applySchemaTable` (`packages/runes/src/lib/index.ts:463-500`) retypes children from
the *parent's* row, and says why in its own comments:

> Children are retyped by the parent, never by themselves (D9). Markdoc transforms
> bottom-up, so by now the children carry their own `typeof` and this rewrites them
> — and only the parent can supply the `property` that nests them.

A parent's `row.children` is keyed by child name, and a `SCHEMA_TYPE_EXPLICIT`
marker distinguishes a type the *author* stated — which survives — from one that
came from the child's fallback row, which the parent may overrule, because
"the parent is the better authority on what an unlabelled child is".

That is exactly composition's requirement. A composed `character` declares `Person`
and child rows keyed by slot name; the `card` and `deflist` primitives it is built
from contribute structure while the outer rune owns the claim. And the explicit
marker means composition cannot silently steal a type an author stated by hand.

**The identity problem is the same problem one layer up.** The fix for SEO is
already "the parent is the authority"; item 2 above is that principle applied to
`data-rune` and cross-page registration rather than to `typeof`. Extending an
existing principle is a much better position than inventing one.

## What worries me, stated plainly

**Contract derivation couples to the primitives' versions.**
`contracts/structures.json` is derived from config per rune. A composed rune's
structure is its expansion, so changing `card`'s structure diffs every composed
rune's contract. That is arguably the feature — it surfaces breakage that would
otherwise ship — but `contracts --check` becomes noisy in a way that needs a story
before this lands, not after.

**The editor's `editHints` are keyed by `data-name`, and in a composed rune those
names belong to the primitives.** Whose hints win, and can a composition rename a
slot for editing purposes? The editor package is dormant by prior decision, so this
is a recorded coupling rather than a blocker — but it is a real one, and a
composed rune is exactly the case that makes it visible.

**It makes a false schema.org claim easier to write.** Composition lowers the bar
to asserting a type, which sharpens {% ref "SPEC-143" /%}'s open question about a
user rune's schema row being published with no reviewer in the loop. Bad CSS is
visible on the page; a wrong `Person` row is invisible by construction. This spec
should not ship a composition path for `schema` before that question has an answer.

**Slot substitution over node lists is where the complexity actually is.** Scalar
`variables` substitution is a string replace. Node-list substitution has to decide
what happens to a slot that is filled twice, a slot that is never filled, a slot
filled with content the primitive's content model rejects, and a slot whose
authored content contains another composed rune. Each has an obvious answer; none
is free.

## Decisions

### D1 — the template is Markdoc, not a new syntax

Per {% ref "ADR-036" /%}. Markdoc is already a template language, already parsed,
already safe, and already spliced by `include`. A bespoke template DSL would be
either a weaker vocabulary in worse clothing or a sandbox problem.

### D2 — a composed rune has no block and ships no CSS

If it needs its own styling it is a declared rune, not a composed one. This keeps
the tiers from collapsing into each other and keeps the CSS-sanitisation question
confined to one tier.

### D3 — the outer rune owns identity; inner runes are implementation detail

`data-rune`, the schema row, and any {% ref "SPEC-144" /%} registration belong to
the composition. An author-stated type on an inner rune survives, per
`SCHEMA_TYPE_EXPLICIT`; an implicit one does not.

### D4 — substitution happens at preprocess, through `include`'s existing path

Not a new pipeline stage. The primitives' transforms must run on the spliced tree
unmodified, which is what the preprocess timing already guarantees.

### D5 — exactly one of: a slot declaration, a composition template, or a `transform`

The same mutual exclusion {% ref "SPEC-143" /%} D8 establishes, extended to three
options. Declaring two is rejected at schema construction, naming the rune.

### D6 — a composed rune's contract is its expansion, not an opaque marker

Recording it opaquely would lose the drift check that makes contracts worth
having. The cost is the version coupling named above, accepted deliberately — but
the noise story is an acceptance criterion, not an afterthought.

## Non-goals

- Replacing {% ref "SPEC-143" /%}'s declared tier — the two tiers coexist, and D5 keeps them distinct
- A template language of refrakt's own (D1, {% ref "ADR-036" /%})
- Letting a composed rune style itself (D2)
- Composing *across* sites, or composing a layout rather than a rune
- Resolving the dormant editor's `editHints` ownership question — recorded, not answered
- Answering {% ref "SPEC-143" /%}'s open question on unreviewed schema.org claims; this spec must not ship a `schema` composition path ahead of it

## Acceptance Criteria

- [ ] A rune can be defined by a Markdoc template that places named slots into other runes
- [ ] Authored content reaches a named slot as a node list, not a string
- [ ] A slot filled twice, never filled, or filled with content the target primitive's content model rejects each has a defined, tested outcome
- [ ] A composition cycle is detected and reported by rune name, at schema construction rather than at render
- [ ] The emitted tree carries the composed rune's `data-rune`; the primitives' markers remain but do not claim the rune's identity (D3)
- [ ] A composed rune's schema.org row retypes its slots via the existing `applySchemaTable` child mechanism, with no new schema code path
- [ ] An author-stated `typeof` on content inside a slot survives the parent's row (`SCHEMA_TYPE_EXPLICIT`)
- [ ] `extractTitle`, breadcrumb resolution and the cross-page registry read the composed rune, not its primitives
- [ ] A composed rune ships no CSS, and a definition that tries to is rejected naming the rune (D2)
- [ ] `refrakt contracts` derives a composed rune's structure by expansion, and the spec states how a primitive's change is reviewed when it diffs many composed contracts (D6)
- [ ] Declaring more than one of slot declaration / template / `transform` is rejected at schema construction (D5)
- [ ] `refrakt inspect` shows both the composition and its expansion
- [ ] One storytelling rune is reimplemented as a composed rune in a spike, and the emitted tree is compared against today's — not necessarily identical, but every difference explained
- [ ] The rune authoring guide documents which tier to reach for, with the table from this spec

## References

- {% ref "SPEC-143" /%} — the declared tier, and the open question this spec must not outrun
- {% ref "SPEC-144" /%} — where a composed rune's cross-page identity comes from
- {% ref "ADR-036" /%} — why the template is Markdoc and not a DSL
- {% ref "ADR-035" /%} — the skin format, which composed runes do not need
- {% ref "SPEC-129" /%} — `include`'s preprocess splice, the mechanism this extends
- {% ref "SPEC-130" /%} — the schema.org table, parent-retypes-children, and the D5 trade
- {% ref "SPEC-063" /%} — file roots and partial resolution; where a template file would live

{% /spec %}
