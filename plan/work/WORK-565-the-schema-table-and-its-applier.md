{% work id="WORK-565" status="ready" priority="high" complexity="complex" source="SPEC-130" tags="runes,schema-org,seo,config,transform" milestone="v0.35.0" %}

# The schema table and its applier

The mechanism: a declarative schema table declared on the rune, an applier that
realises it at transform time, and the three entry kinds
({% ref "SPEC-130" /%}'s `entities`, `text` and `index`) that let it express
what the 30 emitters do imperatively today.

No rune migrates here. This item builds the thing and proves it on the two runes
the spec already prototyped; {% ref "WORK-567" /%} through
{% ref "WORK-571" /%} are the migration.

## Where it lives, and why not the engine

The obvious home is the identity transform engine. **It does not work.**
`packages/content/src/site.ts` never applies the identity transform — it runs
`Markdoc.transform`, then `extractSeo`, and `collectJsonLd` *derives* the JSON-LD
by walking that tree for `typeof`. The engine runs later, at render time. Schema
emitted by the engine would reach the HTML and never reach the JSON-LD.

So the mapping is **data consulted at transform time**.
`createContentModelSchema` sees every rune's own transform, already
post-processes the result, and 34 of the 35 emitters go through it — one step
there instead of 35 edits. The table sits beside the rune's other
self-declarations (`sections`, `mediaSlots`, `provides`, `base`) and is
referenced from config so tooling can read it, exactly as `sections` is.

**`createComponentRenderable` gains no knowledge of schema.** An earlier draft
assumed the applier had to run where the dropped `<meta>` still existed. It does
not: `data-rune-fields` already carries every scalar property value, typed, on
the rune root. The applier resolves a source three ways —

```ts
const node = findByName(root, src);
if (node) { node.attributes.property = prop; return; }   // visible carrier: stamp in place
const v = bag[src];                                       // value-only: rebuild
if (v !== undefined) root.children.push(new Tag('meta', { property: prop, content: String(v) }));
```

— and the third is synthesising an entity span from either. Roughly 60 lines,
per the prototype.

## Acceptance Criteria

- [ ] A rune's schema.org type and property mapping are expressible as data, keyed by a name in the rune's flat namespace ({% ref "ADR-008" /%})
- [ ] **Name resolution is attribute-agnostic** — a source resolves whether it surfaces as `data-name` or `data-field`, and the applier never branches on which, so {% ref "SPEC-133" /%}'s later moves are a no-op for every table
- [ ] A test pins that: the same table resolves against a node moved from `properties` to `refs` without edit
- [ ] The table is an option to `createContentModelSchema`, declared on the rune and referenced from config — `createComponentRenderable` gains no schema knowledge
- [ ] A schema value whose `<meta>` carrier is dropped as pure data is rebuilt from `data-rune-fields`
- [ ] `entities:` expresses a nested entity built from named sibling nodes, carrying its own `type`, the `property` that holds it, and its own property map
- [ ] `text:` names the property taking a node's own content, with the **applier** emitting the RDFa-conformant wrapper — no rune hand-writes one
- [ ] `index` is available as the one value generator, for positions that exist nowhere in the content
- [ ] `by:` selects a row from an attribute, with an explicit fallback row for the absent case
- [ ] A child entity cannot be declared without the property that holds it — the table rejects it rather than letting it float up as a detached top-level entity
- [ ] An entity resolving to a bare `@type` with no properties emits nothing (D4)
- [ ] A property declared a list always serialises as an array, so a one-item and a two-item collection have the same shape (D6)
- [ ] `schema` joins `IDENTITY_FIELDS` in `packages/transform/src/identity-fields.ts`, so no merge path — theme override or variant delta — can redefine it
- [ ] Suppressing schema entirely (`schema="none"`) works on every rune carrying a table, stripping the whole subtree rather than just the root
- [ ] `testimonial` and `event` are converted as the proof, reproducing their baseline JSON-LD — these are the two the prototype already covered
- [ ] The plugin-facing contract documents the table, since 67 of the runes live in plugins (D7)
- [ ] A test asserts the JSON-LD, not just the HTML attributes

## Approach

**Validate `by:` or stop claiming it names a modifier.** `modifiers: { type: {
source: 'meta', default } }` is read by the engine, which has no part in this
path; the row is picked in the wrapper from `attrs`. So `by: 'type'` is in
practice "the attribute named `type`". Both declarations are in scope at build
time, so validating it is cheap — do that, or say plainly in the docs that `by`
names an attribute. Do not ship the ambiguity.

**The RDFa wrapper is conformant, not a workaround.** The tempting move is to
delete the `<div property="text">` and teach `collectJsonLd` to read a typed
node's own text. RDFa Core 1.1 §7.5 step 11 forbids it: an element carrying both
`property` and `typeof` has its object fixed to the typed resource, and its text
is unreachable as a literal. Since {% ref "SPEC-082" /%} renders the SEO
carriers inline, refrakt publishes RDFa *and* JSON-LD on the same page — so
removing the wrapper would have the two channels assert different graphs on
every accordion, recipe and how-to. What is wrong is that runes hand-write it.
`text:` moves the wrapping into the applier and leaves the HTML identical.

**D5 is the honest position, and the acceptance criteria should not imply
otherwise.** Nothing checks a table against schema.org — refrakt ships no
ontology and this milestone does not add one. What replaces validation is
visibility, which is {% ref "WORK-566" /%}'s job and why it lands before the
bulk migrations rather than after.

Keep the hidden `<meta>` carriers. The rendered-node carrier
(`<dd property="prepTime" content="PT15M">15m</dd>`) is better RDFa and is
foreclosed by the harvest decision in {% ref "WORK-563" /%}: the engine builds
that `<dd>`, so stamping it means stamping at engine time, which the pre-engine
harvest would never see. The table says which kind of carrier a row wants,
defaulting to the hidden `<meta>` — today's behaviour, made explicit.

## Blocked by

- {% ref "WORK-562" /%}
- {% ref "WORK-564" /%}

## Blocks

- {% ref "WORK-566" /%}
- {% ref "WORK-567" /%}
- {% ref "WORK-568" /%}
- {% ref "WORK-569" /%}
- {% ref "WORK-570" /%}
- {% ref "WORK-571" /%}

## References

- {% ref "SPEC-130" /%} — "Constraint: this cannot live in the engine", "Selection and application split", the prototype, D4, D6, D7
- {% ref "ADR-028" /%} — why the table belongs to the rune, not the theme
- {% ref "ADR-008" /%} — the flat namespace the keys live in
- {% ref "SPEC-133" /%} — the later moves the attribute-agnostic criterion protects against
- `packages/runes/src/lib/component.ts:84` — the `isSeoMeta` classification this removes
- `packages/transform/src/identity-fields.ts:41` — `IDENTITY_FIELDS`

{% /work %}
