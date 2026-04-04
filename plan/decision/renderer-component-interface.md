{% decision id="ADR-008" status="accepted" date="2026-04-04" tags="svelte, transform, architecture, renderer, astro" %}

# Framework-native component interface for rune overrides

## Context

When a theme or package author writes a Svelte (or future Astro/React) component to override a rune's identity transform, they receive a single `tag` prop containing the full serialized tag object. To access rune properties (like `prepTime` or `difficulty`) or named content regions (like `ingredients` or `media`), they must use refrakt-internal helper functions:

```ts
import { readMeta, findByDataName, nonMetaChildren } from '@refrakt-md/transform';

const prepTime = readMeta(tag, 'prepTime');
const ingredients = findByDataName(tag, 'ingredients');
const content = nonMetaChildren(tag);
```

This has several problems:

1. **Unintuitive for framework developers.** A Svelte or Astro developer expects props and slots, not a tag object they must dissect with unfamiliar helpers.

2. **Leaks internal representation.** The meta tag convention (properties encoded as child `<meta>` tags with `property` attributes, named regions identified by `data-name`) is a transport mechanism between the schema transform and the renderer. Component authors shouldn't need to know about it.

3. **Not portable across frameworks.** Every framework adapter would need to document the same helper-based extraction pattern, and component authors would need to learn it regardless of their framework background.

4. **Grows worse with multi-framework support.** As we add Astro (and potentially React), each framework's component authors face the same friction. The problem multiplies rather than being solved once.

### Current pipeline position

The renderer is the boundary between refrakt's internal tree representation and framework-native components. It already dispatches on `typeof`/`data-rune` to select components. It is the natural place to translate the internal representation into framework-native interfaces.

### What the renderer currently does

```svelte
{#if Component}
  <Component tag={node}>
    {#each node.children as child}
      <Renderer node={child} overrides={merged} />
    {/each}
  </Component>
{/if}
```

All children — including meta tags (properties) and named ref elements — are rendered uniformly into the default slot.

## Proposal

Two complementary changes to how renderers pass data to component overrides:

### 1. Properties as props

The renderer extracts children with a `property` attribute, reads their `content` value, and passes them as named props to the component. Meta tags are filtered out of the rendered children.

A recipe component would receive:

```svelte
<script>
  let { prepTime, cookTime, servings, difficulty, children } = $props();
</script>
```

In Astro:
```astro
---
const { prepTime, cookTime, servings, difficulty } = Astro.props;
---
<slot />
```

**Extraction rule:** For each child where `attributes.property` is set, extract `attributes.content` as a string prop keyed by the property name. Remove these children from the rendered child list.

### 2. Named refs as slots/snippets

The renderer extracts children with a `data-name` attribute and provides them as named slots (Svelte 5 snippets, Astro named slots, React render props).

A recipe component in Svelte 5:

```svelte
<script>
  let { prepTime, difficulty, headline, ingredients, steps, media, children } = $props();
</script>

<article class="my-recipe">
  <div class="hero">
    {@render media?.()}
    {@render headline?.()}
  </div>
  <div class="body">
    {@render ingredients?.()}
    {@render steps?.()}
  </div>
</article>
```

In Astro:
```astro
---
const { prepTime, difficulty } = Astro.props;
---
<article class="my-recipe">
  <div class="hero">
    <slot name="media" />
    <slot name="headline" />
  </div>
  <div class="body">
    <slot name="ingredients" />
    <slot name="steps" />
  </div>
</article>
```

**Extraction rule:** For each child where `attributes['data-name']` is set, provide the pre-rendered subtree as a named slot/snippet keyed by the data-name value. Remove these children from the default slot.

**Important:** Named slots contain identity-transformed content (BEM classes applied, structure injected). Component authors receive styled, structured content — not raw AST nodes. They control *placement*, not *internal rendering*. This is a feature: the identity transform handles the tedious structural work, and the component handles layout.

### What remains in the default slot

After extracting properties and named refs, the default slot contains only "anonymous" content children — children that are neither properties nor named regions. For many runes this will be empty (all content is in named refs). For simpler runes it may contain the primary content body.

## Options Considered

### 1. Properties as props only (no named slots)

Extract property meta tags into props, but leave named ref elements as regular children.

**Pros:**
- Simpler renderer change
- Named refs can still be found via CSS/DOM queries in the component

**Cons:**
- Component authors still can't control layout of named regions without DOM manipulation
- Misses the bigger win — named slots are where most of the authoring friction lives

### 2. Properties as props + named refs as slots (proposed)

Both extractions, giving components a fully framework-native interface.

**Pros:**
- Complete solution — no refrakt helpers needed in component code
- Maps naturally to every major framework's component model
- Components become portable (same logical interface across frameworks)
- Identity transform does the heavy lifting; components just arrange regions

**Cons:**
- More complex renderer implementation
- Named slot mechanism differs per framework (Svelte 5 snippets vs Astro named slots vs React render props)
- Components lose access to the raw tag object (unless we also pass it as a prop for escape-hatch access)

### 3. Keep tag prop, improve helpers

Keep the current `tag` prop interface but provide better, framework-specific helper libraries.

**Pros:**
- No renderer changes
- Full access to raw tag data

**Cons:**
- Doesn't solve the fundamental discoverability and ergonomics problem
- Still couples component authors to refrakt internals
- Still requires learning helpers regardless of framework

### 4. Hybrid — framework-native by default, tag prop as escape hatch

Option 2, but also pass the original `tag` object as a prop for advanced use cases.

**Pros:**
- Best of both worlds — clean default interface, full power available
- Graceful migration path (existing components using `tag` continue to work)

**Cons:**
- Slightly larger prop interface
- Risk of component authors defaulting to `tag` out of habit

## Open Questions

1. ~~**Naming collisions.**~~ **Resolved.** Top-level ref names and property names must be unique within the same rune. A flat namespace is sufficient — properties and slots share it. This is enforceable at schema build time: `createComponentRenderable` already receives both the `properties` and `refs` objects, so a duplicate key across the two can be a static error. Separate namespaces (e.g., `props.x` vs `slots.x`) add API complexity without practical benefit given the low collision risk.

2. ~~**Nested refs.**~~ **Resolved.** Only top-level refs become slots. Nested refs (children with `data-name` inside another ref) remain internal to the parent slot's pre-rendered content. Rationale:

   - **Naming scope.** Nested refs often have generic names (`title`, `label`, `value`, `icon`) that are contextual to their parent. Flattening them to top-level slots would create ambiguity — e.g., `Event` has `label` and `value` nested inside multiple `detail` refs. Top-level-only avoids the scoping problem entirely.
   - **Right level of control.** A component override's purpose is to *place* major content regions, not restructure their internals. The identity transform handles internal structure (BEM classes, nested elements), and that arrives pre-rendered inside the slot.
   - **Escape hatch.** For the rare case where a component needs finer-grained access than slot-level placement, Option 4 (hybrid) provides the `tag` prop as a fallback. The component can then use existing helpers to dig into nested structure.

   Audit of current rune configs confirms this is safe: the vast majority of runes have unique top-level ref names. The only rune with nested naming collisions (`Event` with `label`/`value` inside `detail`) would not be affected since those nested refs stay inside the `detail` slot.

3. ~~**Opt-in vs default.**~~ **Resolved.** The new interface is the default for all component overrides, with the original `tag` prop passed alongside as a companion (Option 4 — hybrid). Existing components that destructure `tag` continue to work unchanged — they simply ignore the new props and slots. New components use props and slots and ignore `tag`. No migration flag, no opt-in mechanism. The renderer always performs extraction; what the component consumes is up to it.

4. ~~**BEM classes on slot content.**~~ **Resolved.** Slots always arrive identity-transformed. No opt-out mechanism. Component overrides control *placement* of content regions, not their internal rendering. CSS overrides are sufficient for restyling internals (BEM selectors like `.rf-recipe__ingredient` remain valid targets). Providing raw content would require the renderer to maintain two versions of each subtree, adding real complexity for a niche case. Components needing fundamentally different internal structure should pair with a schema override, not just a renderer override.

5. ~~**Svelte 5 snippet mechanics.**~~ **Deferred to implementation.** The ADR specifies the contract — components receive named renderables — not the framework-specific mechanism. Each framework adapter implements extraction using its native construct (`createRawSnippet` in Svelte 5, named slots in Astro, render props or children-as-object in React). Pinning the mechanism here would couple the ADR to framework internals that may evolve independently.

6. ~~**Typed component interfaces.**~~ **Resolved.** Approach B (generic interface with renderable type parameter) is the primary path. Rune packages export a generic interface parameterized over the renderable type, keeping packages framework-agnostic:
   - **Package exports.** Each rune package exports prop interfaces alongside schemas (e.g., `import type { RecipeProps } from '@refrakt-md/learning'`). Types are generated as part of the package build from schema metadata.
   - **CLI generation.** `refrakt inspect recipe --types` emits a TypeScript interface with scalar props typed from attributes and `Snippet` types for each named ref.
   - **Vite virtual modules.** The SvelteKit plugin already knows which packages are loaded — it could generate virtual type modules (like it does for content modules) so components get autocompletion and type errors without explicit imports.
   
   The package export approach is the simplest starting point. However, the renderable type for slots is framework-specific (`Snippet` in Svelte 5, `astroHTML.JSX.Element` in Astro, `ReactNode` in React), so rune packages — which are framework-agnostic — cannot ship a complete typed interface directly.
   
   **Approach A: Split scalar props from slot names.** The rune package exports a framework-agnostic contract — scalar property types and slot names as separate constructs. Each framework adapter applies its own renderable type:
   
   ```ts
   // From the rune package (framework-agnostic)
   interface RecipeProperties {
     prepTime?: string;
     cookTime?: string;
     servings?: string;
     difficulty?: 'easy' | 'medium' | 'hard';
   }
   
   type RecipeSlotNames = 'headline' | 'ingredients' | 'steps' | 'tips' | 'media';
   ```
   
   ```ts
   // In a Svelte component
   import type { Snippet } from 'svelte';
   import type { RecipeProperties, RecipeSlotNames } from '@refrakt-md/learning';
   
   type RecipeProps = RecipeProperties & Record<RecipeSlotNames, Snippet | undefined> & { children?: Snippet };
   ```
   
   **Approach B: Generic interface with a renderable type parameter.** The rune package exports a single generic interface parameterized over the renderable type:
   
   ```ts
   // From the rune package
   interface RecipeProps<R = unknown> {
     prepTime?: string;
     cookTime?: string;
     servings?: string;
     difficulty?: 'easy' | 'medium' | 'hard';
     headline?: R;
     ingredients?: R;
     steps?: R;
     tips?: R;
     media?: R;
     children?: R;
   }
   ```
   
   ```ts
   // In a Svelte component
   import type { Snippet } from 'svelte';
   import type { RecipeProps } from '@refrakt-md/learning';
   
   let { prepTime, headline, ingredients, ...rest }: RecipeProps<Snippet> = $props();
   ```
   
   **Approach C: Framework adapter generates concrete types.** The rune package exports only the contract metadata (property names/types, slot names). The framework adapter — or the Vite plugin — generates fully concrete types using the framework's native renderable type. This keeps rune packages entirely free of type-level framework coupling.
   
   Approach B is the most ergonomic for component authors (one import, one generic parameter). Approach A offers the cleanest separation but requires the component author to assemble the full type. Approach C (adapter-generated types from the Vite plugin) is the most decoupled but adds tooling complexity — it can be layered on top of Approach B later when multiple framework adapters exist and the generation story is proven.

## Decision

**Option 4: Hybrid — framework-native by default, tag prop as escape hatch.** The renderer extracts property meta tags as props and top-level refs as named slots, passing them alongside the original `tag` object. Types are provided via generic interfaces (Approach B) exported from rune packages.

## Rationale

The framework-native interface (props + slots) is the right default because it matches what component authors in every framework expect. Passing `tag` alongside preserves backwards compatibility and provides an escape hatch for advanced cases that need full tree access. Together these eliminate the migration burden — existing components keep working, new components get the clean interface.

Always delivering identity-transformed content in slots is the right trade-off because component overrides exist to control placement, not to reimplement internal rendering. The identity transform already handles BEM classes, structural elements, and nested refs — duplicating that in components would be wasted effort.

Deferring snippet/slot mechanics to each framework adapter keeps this decision stable across framework evolution. The contract (named renderables as props) is durable; the mechanism (`createRawSnippet`, `<slot name>`, render props) is framework-specific and may change.

Generic type parameters (Approach B) strike the right balance between ergonomics and framework independence. `RecipeProps<Snippet>` is a single import and one type parameter — minimal ceremony while keeping the rune package free of framework types.

## Consequences

1. **Each framework renderer gains an extraction phase.** Before dispatching to a component, the renderer partitions children into properties, named refs, and anonymous content. This is ~20-30 lines of extraction logic per renderer.

2. **Existing Svelte component overrides continue to work.** The `tag` prop is always passed alongside extracted props and slots. Components can migrate gradually from `tag`-based access to props/slots.

3. **Component authoring documentation simplifies.** Instead of documenting helper functions, we document "your component receives these props and these slots" — which is what framework developers already understand.

4. **`refrakt inspect` gains a component interface view.** The inspect tool could show "this rune provides props: prepTime, difficulty; slots: headline, ingredients, steps, media" — making the component contract discoverable.

5. **Cross-framework component parity.** A recipe component in Svelte and one in Astro would have the same logical interface (same prop names, same slot names), differing only in framework syntax.

## References

- SPEC-033 — Structure Slots and Declarative Flexibility (the structural model that produces refs)
- ADR-006 — Post-identity-transform hook (related pipeline architecture)
- `packages/svelte/src/Renderer.svelte` — current renderer implementation
- `packages/transform/src/helpers.ts` — current helper functions for tag extraction
- `packages/runes/src/lib/component.ts` — `createComponentRenderable` (sets property attributes)

{% /decision %}
