{% spec id="SPEC-157" status="draft" tags="runes, composition, docs, plugins, feasibility, content-model" %}

# Docs plugin composition audit

## Summary

Ninth and last plugin audited against {% ref "SPEC-145" /%}, and the quickest verdict in the
series: **docs is a domain package, and its runes are almost beside the point.**

`plugins/docs/src` is 3,261 lines. **2,368 of them — 73% — are `extract/`**: a TypeScript
parser (705), a Python parser (657), a Python docstring parser (473), a symbol generator
(244), a command (189), plus types and a layout generator. On top of that sits
`cli-plugin.ts` (123) with a `./cli-plugin` package export and an MCP tool, whose one command
is *"Extract symbols from source code into `{% symbol %}` Markdown"*.

The three runes are **422 lines, 13%**. So the runes are the extractor's *output format*, and
the plugin exists for the extractor. That is {% ref "ADR-039" /%}'s domain-package shape
exactly — code plus a workflow plus tooling — and it is the second instance after `plan`,
which is what gives that category two data points rather than one.

## The three runes

| Rune | Lines | Verdict |
|---|---|---|
| `api` | 67 | **Composes today** — the cleanest candidate in the corpus |
| `changelog` | 116 | Composes after adopting `emitTag` |
| `symbol` | 239 | Needs one new form; see below |

### `api` — the cleanest composition candidate audited

A plain `sequence` content model, `metaFields` + `blocks` + `layout: { root: ['eyebrow',
'body'] }`, **no schema table**, no `postTransform`, no behavior. And its CSS already takes
geometry from the shared row primitive — `packages/lumina/styles/runes/api.css` records that
*"Geometry + the auth right-push come from `[data-zone-layout="bar"]`"*.

So it is already declarative, already on the primitive {% ref "SPEC-156" /%} consolidates,
and has no schema to lose across a boundary. Nothing gates it. Worth naming because eight
prior audits produced no rune this unencumbered, and it is the obvious first migration in the
whole programme.

### `changelog` — a thunk, and a second `emitTag` non-adopter

Its content model is `contentModel: () => ({ type: 'sections', … })` — **a function that
ignores its argument and returns a constant.** That is an idiom, not a capability; flattening
it to a plain object is free and should happen regardless, because it otherwise reads as an
attribute-varying model and is not one.

Its transform then maps resolved sections to `changelog-release` tag nodes by hand, which is
what `emitTag` does. Second instance in this series after `playlist`
({% ref "SPEC-155" /%} D3) of *the transform hand-rolls `emitTag`*, and the same fix applies.

### `symbol` — an attribute-varying content model, which is a new shape

`symbol`'s content model is genuinely a function of its attributes:

```ts
contentModel: (attrs) => {
  if (GROUP_KINDS.includes(attrs.kind as string)) {
    return { type: 'custom', processChildren(nodes) { /* headingsToList({ level: 3 }) → symbol-group tags */ } };
  }
  return { type: 'sequence', fields: headerBodyFields };
},
```

A `class`, `interface` or `module` promotes every `###` heading into a `symbol-group`; every
other kind is a flat header/body sequence. **No prior audit hit this**: eight plugins
produced custom content models, but none whose *choice* of model depended on an attribute.

It decomposes into two parts, and neither is a new category:

1. **The variance** is the content-model counterpart of {% ref "SPEC-130" /%}'s variant
   schema — `{ by, rows, fallback }` — which `playlist` and `track` already use for schema.
   The obvious form is `contentModel: { by: 'kind', models: { … }, fallback: { … } }`, and
   having precedent for the exact shape in the same codebase is most of the argument for it.
2. **The group branch** is heading-delimited sections plus `emitTag: 'symbol-group'`, which
   is what `itinerary` and `accordion` already do.

So `symbol` needs the variant form applied to content models and nothing else. Under
{% ref "ADR-030" /%} rule 5b that is an *enabling* addition with one concrete case, so it
either waits for a second consumer or ships provisional — but it is a small, well-precedented
shape rather than an open problem.

`symbol` also carries `symbolSchema = { type: 'TechArticle' }` with `pageSectionProperties`
sourcing, so it is one of {% ref "SPEC-151" /%} D3's six and gated on
{% ref "SPEC-146" /%} like the rest.

## What the plugin has none of

No pipeline hooks — `plugins/docs/src/index.ts` exports runes, config and the CLI plugin,
nothing else. No `postTransform`. No behaviors or component overrides. So
{% ref "SPEC-144" /%} has nothing to do here, and the plugin's weight is entirely in the
extractor rather than in the rendering path.

## Decisions

### D1 — docs is a domain package, and this is the second instance of that category

Code, a workflow and tooling — a CLI command and an MCP tool that generate rune content from
source files. {% ref "ADR-039" /%} names the category; `plan` and `docs` are its two members,
and having two is what makes it a category rather than a description of `plan`.

### D2 — `api` composes first, across the whole programme

Not just first in this plugin. It is already declarative, already on the row primitive, and
carries no schema table, so it exercises the composition path end to end with nothing else
pending. Every other candidate is gated on {% ref "SPEC-146" /%}, on `emitTag`, or on a
content-model addition.

### D3 — flatten `changelog`'s thunk, independently of everything else

It is a constant wrapped in a function. Leaving it misrepresents the codebase as having two
attribute-varying content models when it has one, which matters because D4 turns on the count.

### D4 — an attribute-varying content model is a real shape with exactly one consumer

Recorded so it is neither invented for `symbol` alone nor forgotten. `{ by, models, fallback }`
mirrors {% ref "SPEC-130" /%}'s variant schema; {% ref "ADR-030" /%} rule 5b's bar wants a
second consumer before it ships stable, and `bento`'s parent-attribute cascade is *not* one —
that is a different mechanism ({% ref "SPEC-156" /%} D8).

### D5 — the runes stay distributed even once they are compositions

They are the extractor's output contract. A user hand-writing their own `{% symbol %}`
composition would diverge from what `refrakt docs extract` emits, which is a silent break of
the tool rather than a styling preference. {% ref "ADR-039" /%}'s third criterion — curated
knowledge nothing validates — applies here as a *format* rather than a schema mapping.

## Implementation notes, deliberately not yet work items

1. **Compose `api`** (D2). First in the programme, gated on nothing.
2. **Flatten `changelog`'s thunk** (D3), then adopt `emitTag: 'changelog-release'`.
3. **Leave `symbol`** until the content-model variant form has a second consumer (D4).
4. **Leave `extract/` entirely alone.** It is the plugin.

## Non-goals

- Deleting `plugins/docs/` — it stays, on the extractor (D1)
- Specifying the content-model variant form (D4 records the shape; it needs its own spec)
- Touching the `extract` CLI command, the MCP tool, or either language parser
- Re-auditing the eight plugins this series already covered

## Acceptance Criteria

- [ ] `api` exists as a composition with a fixture, rendering identically to its declared form, with `refrakt contracts --check` and `npm run seo:baseline:check` reporting no drift
- [ ] `changelog`'s content model is a plain object rather than a thunk, and the repo has exactly one attribute-varying content model (D3)
- [ ] `changelog` emits its releases via `emitTag`, and the hand-rolled section mapping is gone
- [ ] `symbol` is unchanged until the variant form exists, and this spec's decomposition of its two branches is recorded in the authoring guide as the plan for it
- [ ] `plugins/docs/src/extract/` is untouched, and `refrakt docs extract` produces byte-identical output before and after `api` and `changelog` are composed
- [ ] The authoring guide names `api` as the introductory composition example for a first-party rune, beside `objective` ({% ref "SPEC-154" /%}) for a planned one

## References

- {% ref "ADR-039" /%} — where a rune lives; this plugin is the second domain package, which is what makes that category real
- {% ref "SPEC-145" /%} — composed runes; the mechanism audited
- {% ref "SPEC-146" /%} — name resolution; what gates `symbol`
- {% ref "SPEC-151" /%} — the marketing audit; `symbol` is one of its six `pageSectionProperties` cases
- {% ref "SPEC-155" /%} — the media audit; the first `emitTag` non-adopter, which `changelog` joins
- {% ref "SPEC-156" /%} — the ladder and row arrangements; `api` is already a consumer of the row primitive
- {% ref "SPEC-130" /%} — the variant schema form D4's content-model counterpart would mirror
- {% ref "ADR-030" /%} — rule 5b's bar, which D4's one consumer does not yet clear

{% /spec %}
