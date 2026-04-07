/**
 * Component registry for Astro component overrides.
 *
 * Maps rune type names (the `data-rune` attribute value) to Astro components.
 * Components receive extracted properties as props, named refs as named slots,
 * anonymous content as the default slot, and the original `tag` as a prop.
 *
 * Usage in an .astro page:
 * ```astro
 * ---
 * import MyRecipe from '../components/MyRecipe.astro';
 * const components = { recipe: MyRecipe };
 * ---
 * <RfRenderer node={renderable} components={components} />
 * ```
 */
export type ComponentRegistry = Record<string, any>;

/**
 * Default component registry — empty.
 *
 * All runes render through the identity transform + @refrakt-md/behaviors.
 * Theme authors or site authors register .astro component overrides for runes
 * that need custom rendering.
 */
export const registry: ComponentRegistry = {};
