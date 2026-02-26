import type { ComponentRegistry } from '@refrakt-md/svelte';

/** Maps typeof attribute values to base theme Svelte components.
 *
 *  All runes are now rendered purely through the identity transform engine:
 *
 *  - Interactive runes requiring client-side lifecycle (Diagram, Map, Nav, Sandbox)
 *    are framework-neutral web components in @refrakt-md/behaviors, initialized
 *    via custom elements. Their postTransform hooks produce custom element tags.
 *
 *  - Data rendering runes (Chart, Comparison, Embed, Testimonial, DesignContext)
 *    use postTransform hooks to generate their complete HTML structure.
 *
 *  - Behavior-driven runes (tabs, accordion, datatable, form, reveal, preview, details)
 *    use BEM classes from the identity transform + @refrakt-md/behaviors.
 *
 *  - Layout runes (grid, bento, storyboard, pricing) are fully handled by
 *    identity transform + CSS attribute selectors / custom properties.
 *
 *  The registry is empty but preserved for user-defined component overrides.
 */
export const registry: ComponentRegistry = {};
