# Marquise on Comark: can the typed layer run as a Comark plugin?

A throwaway spike, run on 2026-11-13 to test option **B** in
`notes/marquise-foundation.md` (section 16, Z1, "Deep dive: Comark"): Marquise as the typed
content-model layer on top of [Comark](https://github.com/comarkdown/comark)'s syntax, tree and
renderers, with no renderers of its own.

**Short answer: yes.** Refrakt's own content-model resolver runs unchanged on Comark's tree through
a small adapter; shapes declared as files become one generic Comark plugin; its output is Comark's
explicit form (props and named slots), which `@comark/react` renders with typed props. About 550
lines in total. The gaps found are listed below, and none of them blocks the approach.

## Run it

`src/plugin.ts` imports refrakt's real resolver (`packages/runes/src/lib/resolver.ts`), which needs
`@markdoc/markdoc` from the repository root.

```bash
npm ci                      # at the repository root
cd spike/marquise-comark
npm install
npm run types               # shapes/*.md → generated/shapes.d.ts (React prop types)
npm run resolve             # content/*.md → findings and the explicit Comark form
npm run render              # content/home.md → HTML through @comark/react
npm run stream              # validation on partially streamed content
npm run markdoc             # content/home.mdoc → Markdoc → a Comark document → @comark/react
```

## What is here

| File | Role |
|---|---|
| `shapes/hero.md`, `shapes/callout.md` | shapes declared as files: attributes, content model, SPEC-200's `as` and `from`, `plain: { tag }` |
| `content/home.md`, `broken.md`, `explicit.md` | valid content, content with errors, content mixing explicit slots with inference |
| `src/adapter.ts` | Comark tuples to Markdoc-shaped AST nodes and back; every node remembers its Comark origin |
| `src/shapes.ts` | loads shape files and normalises them into the arrays the resolver expects |
| `src/plugin.ts` | the Comark `post` plugin: attribute validation, content-model resolution, findings with lines, rewrite into explicit form |
| `src/types-gen.ts` | React prop types from shape files, following Comark's conventions |
| `src/render.tsx` | renders through `@comark/react`, with the plain presentation for unbound shapes |
| `src/plain.ts` | the plain presentation as a React component |
| `src/markdoc-front.tsx` | a Markdoc front end: shapes as Markdoc tag schemas, output converted into a Comark document |
| `content/home.mdoc` | the same page in Markdoc syntax, with a variable and an `if` inside the hero |
| `components/Hero.tsx` | a component typed by the generated props |

## Results

| Question | Result |
|---|---|
| Can refrakt's resolver run on Comark's tree? | **Yes, unchanged.** An adapter of about 100 lines maps `p`, `h1`–`h6`, `ul`/`ol`/`li`, `img`, `a`, `hr`, `blockquote`, `pre` and components onto Markdoc-shaped nodes. The resolver's only runtime need is Markdoc's `Ast.Node` |
| Can shapes as files drive a generic plugin? | **Yes.** Two shape files, one plugin; nothing is written per shape |
| Explicit Comark output | `hero` became `align`, `mediaPosition`, `eyebrow`, `:actions` (JSON) as props and `#media`, `#headline`, `#blurb`, `#actions` as slots. `renderMarkdown` prints it as valid Comark, using a YAML props block |
| SPEC-200 `as` | `as: text` became a string prop (`eyebrow`); `as: inline` became a slot of the heading's or paragraph's inline content; the default kept whole nodes |
| SPEC-200 D9 `from` | `href` read from the node `label` matched: `[{"label":"Get started","href":"/docs"},…]` |
| SPEC-200 D10 item `content` | see gap 3 |
| Explicit slots mixed with inference (Z1b) | an author's `#headline` filled the field directly; `#default` went through the content model |
| Findings | `attribute-type-invalid`, `attribute-unknown`, `content-missing`, `content-unmatched`, `field-text-formatting-dropped`, each with the shape's line (`content/broken.md:3`) |
| Generated types | `HeroProps` with unions from `matches`, defaults making props required, `eyebrow: string`, `slotHeadline: ReactNode` (Comark's React convention), `actions: { label: string; href: string }[]` |
| Rendering | `@comark/react` rendered the bound `Hero` with typed props and slots; the unbound `callout` rendered through the plain presentation as `<aside data-shape="callout" data-tone="warning" data-title="Heads up"><div data-slot="body">…` |
| Streaming | with `autoClose`, the hero's slots and props fill in as content arrives (`media,headline` at 120 characters; all four at 200) |

## Gaps found

1. **An unregistered component loses its content in Comark.** With no components registered,
   `@comark/react` rendered `<hero … actions="[object Object],[object Object]"></hero>`: a bare
   element, the slot content gone, a React warning for `mediaPosition`. The plain presentation
   (SPEC-199 decision 3) is necessary, not cosmetic, and `shape-unbound` should be reported.
2. **Source positions exist only for components, and only in the tokens.** Comark's tree has no
   lines; the markdown-it tokens handed to `post` do: every `mdc_block_open` has a line map
   (`hero [2,8]`), slot tokens have none. Findings therefore point at the shape's line, not the
   offending child. Finer positions (for the language server, `source()` in SPEC-198, an editor)
   need a token-to-node mapping inside the plugin, or positions in Comark's tree.
3. **Item content cannot travel inside a prop.** Comark props are JSON; renderables travel only as
   slots. SPEC-200 D10's per-item `content` became one slot holding the whole list (`#actions`)
   beside the data prop (`:actions`). Per-item renderable content would need a slot per item or a
   different convention.
4. **Validation needs a streaming mode.** Mid-stream, the callout's body had not arrived and was
   reported as `content-missing`. Missing-content findings should wait until a component is
   closed; whether `autoClose` exposes which components it closed was not checked.
5. **Printing the resolved tree rewrites the author's file.** `renderMarkdown` on the plugin's output
   prints the explicit form (YAML props, named slots), not what the author wrote. A write path
   (Z5) must edit the source form, not print the resolved one.
6. **Prop types are per renderer.** React receives named slots as `slot{Name}` props; Vue receives
   named slots. The type generator needs one output per renderer.

## Markdoc through Comark's renderers

*Added 2026-11-13.* Can Markdoc content use Comark's renderers? **Yes.** Comark's renderers consume
its document format, not its syntax, so a Markdoc front end only has to produce that document:

```
Markdoc source → Markdoc parse + transform (shapes, variables, if) → a Comark document → @comark/react
```

- **Shapes become Markdoc tag schemas** whose `transform` runs the same resolver directly on
  Markdoc's AST (no adapter needed on this side) and returns Comark's explicit form: a tag with
  props, every slot a `template` child.
- **The conversion is about 15 lines:** Markdoc's renderable `Tag { name, attributes, children }` is
  almost Comark's `[name, attributes, ...children]` already; non-string attributes become Comark's
  `:`-prefixed JSON.
- **The output is the same page:** the same `Hero` component and the same plain `callout` rendered
  `content/home.mdoc` exactly as they rendered `content/home.md`, with `{% $user.name %}` resolved
  to "Ada" in the headline.
- **`{% if %}` inside a shape must be evaluated before the content model.** With
  `showActions: false` the actions were left out as intended. Without evaluating `if` first, the
  resolver saw an `if` tag instead of a list and **the actions disappeared silently**, even with
  `showActions: true` (an optional field, so nothing was reported). `expandConditionals` resolves
  the condition with Markdoc's own `node.resolve(config)` and keeps the branch that applies. In
  refrakt, only templates handle `if` (SPEC-145 D30, `packages/runes/src/lib/composition.ts:825`);
  an author's `if` inside a rune's content looks like it has the same gap, worth checking.

## Not tested

The Vue, Svelte and Angular renderers; the Nuxt module; nested shapes inside slots (the plugin
recurses, but no content exercised it); performance; a language server on Comark syntax;
Markdoc functions on the Markdoc path; validation findings on the Markdoc path (only missing
fields are collected there).
