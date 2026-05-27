/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { themeToggleBehavior } from '../src/behaviors/theme-toggle.js';

beforeEach(() => {
	document.body.innerHTML = '';
	delete document.documentElement.dataset.theme;
	delete document.documentElement.dataset.tintLock;
	try { localStorage.clear(); } catch (_) { /* ignore */ }
});

function mount(): { container: HTMLElement; btn: HTMLButtonElement } {
	const container = document.createElement('div');
	container.innerHTML = '<button class="rf-theme-toggle" data-theme-toggle><span class="rf-theme-toggle__icon"></span></button>';
	document.body.appendChild(container);
	return { container, btn: container.querySelector('button')! };
}

describe('themeToggleBehavior', () => {
	it('no-ops (no throw) when there are no toggle buttons', () => {
		const container = document.createElement('div');
		expect(() => themeToggleBehavior(container)()).not.toThrow();
	});

	it('reflects the saved preference onto the button on init', () => {
		localStorage.setItem('rf-theme', 'dark');
		const { container, btn } = mount();
		themeToggleBehavior(container);
		expect(btn.dataset.themePref).toBe('dark');
		expect(btn.getAttribute('aria-label')).toBe('Theme: dark');
	});

	it('defaults to auto when nothing is saved', () => {
		const { container, btn } = mount();
		themeToggleBehavior(container);
		expect(btn.dataset.themePref).toBe('auto');
	});

	it('cycles auto → light → dark → auto, persisting and applying each step', () => {
		const { container, btn } = mount();
		themeToggleBehavior(container);

		btn.click(); // auto → light
		expect(localStorage.getItem('rf-theme')).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('light');
		expect(btn.dataset.themePref).toBe('light');

		btn.click(); // light → dark
		expect(localStorage.getItem('rf-theme')).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(btn.dataset.themePref).toBe('dark');

		btn.click(); // dark → auto (data-theme removed so prefers-color-scheme wins)
		expect(localStorage.getItem('rf-theme')).toBe('auto');
		expect(document.documentElement.dataset.theme).toBeUndefined();
		expect(btn.dataset.themePref).toBe('auto');
	});

	it('cleanup detaches the click handler', () => {
		const { container, btn } = mount();
		const cleanup = themeToggleBehavior(container);
		cleanup();
		btn.click();
		expect(localStorage.getItem('rf-theme')).toBeNull();
		expect(document.documentElement.dataset.theme).toBeUndefined();
	});
});
