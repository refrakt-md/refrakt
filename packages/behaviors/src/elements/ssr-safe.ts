/**
 * SSR-safe base class for web components.
 *
 * In browser environments, this is just HTMLElement.
 * In Node.js/SSR, it's an empty class so module evaluation doesn't crash.
 * The actual custom element registration (customElements.define) is guarded
 * separately in registerElements().
 */
export const SafeHTMLElement: typeof HTMLElement =
	typeof HTMLElement !== 'undefined'
		? HTMLElement
		: (class {} as unknown as typeof HTMLElement);
