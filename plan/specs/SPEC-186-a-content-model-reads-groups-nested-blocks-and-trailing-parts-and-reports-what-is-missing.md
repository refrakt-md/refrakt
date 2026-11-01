{% spec id="SPEC-186" status="draft" tags="runes, content-model, composition, resolver, section, reinterpretation" %}

# A content model reads groups, nested blocks and trailing parts, and reports what is missing

A declarative content model is a flat sequence of fields, each matching one node type, in order. That
is enough for most runes, and not enough for four things this repository already does by hand or
cannot do at all:

1. **Parts that only count together.** An eyebrow is a paragraph only when a headline follows it
   ({% ref "ADR-046" /%}); an epigraph is a blockquote only with its attribution
   ({% ref "SPEC-185" /%} D5). Written as independent optional fields, either part can be read alone.
2. **Parts inside a matched block.** An attribution written as a blockquote's last line
   (`> — **Ada Lovelace**, Analyst`) is inside the node a `blockquote` field matched, and no field
   can read inside it.
3. **A trailing part after a run.** A body of paragraphs followed by an attribution paragraph: a
   greedy `body` takes the attribution too.
4. **A required part that never came.** Nothing reports it.

This spec adds a construct for each, in the vocabulary content models already use, and proves them
on the one native rune whose real grammar is hand-written: `section`.

## Why

**`section` declares a content model and does not use it.** Its schema declares a sequence
(`eyebrow?`, `headline?`, `blurb?`, `body*`), and its transform's first step is to put those fields
back together in source order and re-read them with the hand-written `sectionHeaderParts`. The comment
there says why: the sequence "would read a paragraph with no heading after it as an eyebrow". The
grammar compositions are audited against (`schemaHeaderRoles`) is that same hand-written reader. So
the header that every composition over `section` relies on (`hero`, `cta`, `testimonial`, and `card`
when it is composed) is code, not declaration, because the model cannot say "these together or not
at all".

**Compositions can only use what is declarative.** A native rune can fall back to code; a composition
cannot. If the epigraph and the inside-the-quote attribution of SPEC-185 exist only in hand-written
readers, compositions can never offer them, and the same Markdown means one thing in a native rune
and another in a composed one.

**What the resolver does with a required field today**, for the record. `resolveSequence` walks
fields in order and children in order:

- A field that matches takes its node (or, `greedy`, the run of matching nodes).
- An `optional` field that does not match is skipped; the child waits for the next field.
- A required field that does not match **drops the child** and reports it as `content-unmatched`,
  then resolution continues with the next field. So `Prose.` followed by `**Ada** — Analyst`, under
  a required `quote` and an optional `attribution`, reports `Prose.` and then reads the attribution,
  with no quote: the report names the wrong problem, and the result is wrong.
- A required field reached after the children have run out is skipped **silently**.

## Decisions

### D1 — an optional group matches all of its required members, or nothing

A field may be a **group**: an ordered set of member fields that matches as one.

```yaml
epigraph:
  optional: true
  group:
    quote:       { match: blockquote }
    attribution: { match: paragraph, itemModel: { fields: [ { name: name, match: strong } ] } }
```

1. **All or nothing.** A group matches when every one of its required members matches, in order,
   from the current position. Then it takes those nodes. Otherwise it takes nothing, and every node it
   looked at is left for the field after it. This is SPEC-182 D3's rule ("match only when the
   required parts are there") applied to sibling nodes instead of the parts of one paragraph.
2. **Members may be optional**, as fields are. An optional member that does not match is skipped
   inside the group without failing it: an eyebrow before a required headline.
3. **A group may be required or optional**, as a field is, and may contain groups.
4. **Members resolve to their own names**, as if written at the group's level: a composition places
   `{% slot name="quote" /%}`, not a path. Member names are unique across the whole model, and a
   duplicate is rejected at load. The group's own name resolves to whether it matched, for
   conditions.
5. **No backtracking across fields.** The group tries its members once, from where it stands. A
   group that fails does not make an earlier field give anything back.

### D2 — a block field reads its node's children with a nested model

A field matching a block node (`blockquote`, a list item's block content) may declare `model`, a
content model applied to that node's children:

```yaml
quote:
  match: blockquote
  model:
    type: sequence
    fields:
      body:        { match: paragraph, greedy: true, yields: true }
      attribution:
        match: paragraph
        optional: true
        itemModel:
          fields:
            - { name: dash, match: text, pattern: '^\s*[—–-]\s*$' }
            - { name: name, match: strong }
            - { name: source, match: text, pattern: '^\s*,?\s*(.+)$', optional: true }
```

1. **The field still matches the whole node**, as today. The nested model reads its children into
   members named `quote.body` and `quote.attribution`: dotted, because a nested model is the
   node's own, and its members may repeat names used elsewhere (`body`).
2. **A composition places a member by its dotted name** (`{% slot name="quote.attribution" /%}`) or the
   whole node by the field's name, not both (SPEC-145 D11's placed-once rule extends to members).
3. **The nested model is any content model**, so a group (D1) or a condition can sit inside it.
4. **An unmatched child inside the node is reported** as `content-unmatched`, naming the field.

### D3 — a greedy field can yield its trailing nodes to the field after it

`yields: true` on a greedy field: after it collects its run, it gives back the trailing nodes the
**next** field (or group) would take, when that field would otherwise match nothing.

- `body` (greedy paragraphs, `yields`) followed by `attribution` (a paragraph with a `strong`): the body
  takes every paragraph but a final attribution, which the next field claims. With no attribution
  paragraph, the body keeps everything.
- **One field of lookahead.** The yield asks only the next field. It does not search the model.
- **Only what that field matches.** A yielding field never gives back a node the next field would
  reject, so an ordinary last paragraph stays in the body.

### D4 — a required field that matched nothing is reported

1. **`content-missing`** is reported for a required field (or required group, or required member of a
   matched group) that took no node: whether the children ran out first or the field was skipped. It
   names the field and the rune, at the rune's line.
2. **A child skipped by a required field is no longer dropped.** It stays for the next field, as it
   does after an optional one, and is reported as `content-unmatched` only if nothing takes it. The
   report then names the real problem (the missing field), and nothing after it is misread on the
   strength of a field that is not there.
3. **Rollout**: `content-missing` is a warning for one release, then an error. Before it lands, a
   sweep of `site/content`, the SEO fixtures and the composed fixtures lists every instance, and each
   is fixed or its field made optional where the rune genuinely accepts the absence.

### D5 — `section`'s header grammar is declared, and the hand-written reader goes

`section`'s content model becomes its grammar:

```yaml
type: sequence
fields:
  header:
    optional: true
    group:
      eyebrow:  { match: paragraph, optional: true }
      headline: { match: heading }
      blurb:    { match: paragraph, optional: true }
  body: { match: any, optional: true, greedy: true }
```

- A paragraph with no heading after it fails the `header` group (its required `headline` is missing)
  and falls to `body`: ADR-046, declared.
- **The media zones stay where they are.** `section` splits its media and footer zones on `---` before
  it reads its header (`sectionZones`). The header model applies to the content zone, which a
  delimited model already expresses; the spec's work item confirms the zone split reads the same
  through it.
- **The `header` attribute's modes** (`headline`, `none`) become conditional models (`when`), which
  the content model already supports.
- **`sectionHeaderParts` and the reader registered in `schemaHeaderRoles` are removed.** Rendering,
  the composition audit and the editor read the header from the one declaration, so they cannot
  disagree. Every existing `section`, `hero`, `cta` and `testimonial` test passes unchanged: that is the
  gate.
- SPEC-185 D5's epigraph is then one more optional group inside `header`, after the blurb.

### D6 — compositions declare the same constructs

A composition definition's `content` accepts `group`, `model` and `yields` in the same YAML, with the
same load-time checks: unknown keys, a group with no required member, duplicate member names, a nested
model on a non-block field, `yields` on a field that is not greedy or has no field after it. Each is
reported at definition load, naming it, and the composed-runes guide's Errors table gains an entry for
each new code.

## Not in scope

- **The attribution and epigraph themselves.** SPEC-185 defines them; this spec provides what they
  are declared with.
- **Backtracking or general lookahead.** D1 and D3 each look at most one field ahead of where they
  stand. A model that needs more is a model to restructure.
- **Inline-level groups.** `itemModel` already reads a paragraph's inline parts in order.

## Open questions

- **Dotted names (D2).** Members of a nested model are `quote.body`; members of a group are flat
  (D1.4). The asymmetry is deliberate (a nested model is a node's own namespace; a group is a
  grouping of the model's own fields), but it is worth confirming once compositions use both.
- **`yields` or an anchor.** An attribution field could instead say `position: last`. `yields` is
  stated on the field that gives, which keeps the body's behaviour visible where it is declared; an
  anchor is stated on the field that takes. One should be chosen, not both.

## Acceptance Criteria

- [ ] A content model accepts an optional or required group that matches all of its required members in order, or takes nothing and leaves its nodes for the next field
- [ ] A block field accepts a nested `model` over its node's children, resolved to dotted member names, with unmatched children reported
- [ ] A greedy field with `yields` gives its trailing nodes to the next field when that field would otherwise match nothing, and keeps them otherwise
- [ ] A required field, group or member that took no node is reported `content-missing`, as a warning for one release, and a child it skips is no longer dropped
- [ ] The sweep of `site/content` and the fixtures is done, and each `content-missing` it found is fixed or its field made optional
- [ ] `section`'s header is read from its declared model, and `sectionHeaderParts` and its header-role reader are removed, with every section, hero, cta and testimonial test passing unchanged
- [ ] Composition definitions accept `group`, `model` and `yields`, with load-time errors for each misuse documented in the composed-runes guide

## References

- {% ref "ADR-046" /%}: the header grammar D5 declares.
- {% ref "SPEC-182" /%}: paragraph item models, and D3's match-only-when-present rule D1 generalises.
- {% ref "SPEC-185" /%}: the epigraph (D5) and attribution (D6) that depend on D1–D3.
- {% ref "SPEC-145" /%}: D11, placed-once, extended to members.
- {% ref "SPEC-169" /%}: the content models a composition takes.

{% /spec %}
