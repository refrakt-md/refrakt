import { RfDiagram } from './diagram.js';
import { RfNav } from './nav.js';
import { RfMap } from './map.js';
import { RfSandbox } from './sandbox.js';

/**
 * Register all web component custom elements.
 * Idempotent — safe to call multiple times.
 * No-op in SSR (Node.js) where customElements is not defined.
 */
export function registerElements(): void {
	if (typeof customElements === 'undefined') return;

	const elements: Array<[string, CustomElementConstructor]> = [
		['rf-diagram', RfDiagram],
		['rf-nav', RfNav],
		['rf-map', RfMap],
		['rf-sandbox', RfSandbox],
	];

	for (const [name, ctor] of elements) {
		if (!customElements.get(name)) {
			customElements.define(name, ctor);
		}
	}
}

export { RfContext } from './context.js';
export type { PageEntry, DesignTokens } from './context.js';
export { RfDiagram } from './diagram.js';
export { RfNav } from './nav.js';
export { RfMap } from './map.js';
export { RfSandbox } from './sandbox.js';
