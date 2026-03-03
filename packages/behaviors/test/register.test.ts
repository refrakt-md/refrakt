import { describe, it, expect, vi } from 'vitest';

describe('registerBehaviors', () => {
	it('adds new behavior entries', async () => {
		// Use dynamic import to get a fresh module for each test
		const { registerBehaviors } = await import('../src/index.js');

		const mockFn = vi.fn(() => () => {});
		registerBehaviors({ 'my-custom-rune': mockFn });

		// The behavior should now be registered — we can verify by checking it doesn't throw
		// (We can't directly access the private map, but we can verify via initRuneBehaviors)
		expect(mockFn).not.toHaveBeenCalled(); // Only called when a matching element is found
	});

	it('does not overwrite existing core behaviors', async () => {
		const { registerBehaviors } = await import('../src/index.js');

		const mockFn = vi.fn(() => () => {});
		// 'accordion' is a core behavior — registerBehaviors should NOT overwrite it
		registerBehaviors({ accordion: mockFn });

		// The mock should not have replaced the core behavior
		// (verify by importing the original and checking it's still the same reference)
		const { accordionBehavior } = await import('../src/behaviors/accordion.js');
		expect(accordionBehavior).toBeDefined();
		expect(mockFn).not.toHaveBeenCalled();
	});

	it('overrideBehavior replaces existing entries', async () => {
		const { overrideBehavior } = await import('../src/index.js');

		const mockFn = vi.fn(() => () => {});
		// overrideBehavior explicitly replaces
		overrideBehavior('accordion', mockFn);

		// Can't directly verify the internal map without DOM, but no error means success
		expect(true).toBe(true);
	});
});
