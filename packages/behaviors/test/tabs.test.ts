/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { tabsBehavior } from '../src/behaviors/tabs.js';
import { resetIdCounter } from '../src/utils.js';

beforeEach(() => {
	document.body.innerHTML = '';
	resetIdCounter();
});

function createTabGroup(opts?: { tabCount?: number; rune?: string }): HTMLElement {
	const count = opts?.tabCount ?? 3;
	const rune = opts?.rune ?? 'tab-group';

	const tabs = Array.from({ length: count }, (_, i) => `
		<button data-rune="tab" role="tab" class="rf-tab">
			<span data-name="name">Tab ${i + 1}</span>
		</button>
	`).join('');

	const panels = Array.from({ length: count }, (_, i) => `
		<div data-rune="tab-panel" role="tabpanel">
			<div>Content ${i + 1}</div>
		</div>
	`).join('');

	const el = document.createElement('section');
	el.setAttribute('data-rune', rune);
	el.className = rune === 'code-group' ? 'rf-codegroup' : 'rf-tabs';
	el.innerHTML = `
		<div data-name="tabs" role="tablist" class="${rune === 'code-group' ? 'rf-codegroup__tabs' : 'rf-tabs__tabs'}">${tabs}</div>
		<div data-name="panels" class="${rune === 'code-group' ? 'rf-codegroup__panels' : 'rf-tabs__panels'}">${panels}</div>
	`;
	document.body.appendChild(el);
	return el;
}

function createCodeGroup(opts?: { tabCount?: number }): HTMLElement {
	const count = opts?.tabCount ?? 2;

	const tabs = Array.from({ length: count }, (_, i) => `
		<button data-name="tab" role="tab" class="rf-codegroup__tab">
			<span>file${i + 1}.ts</span>
		</button>
	`).join('');

	const panels = Array.from({ length: count }, (_, i) => `
		<div data-name="panel" role="tabpanel" class="rf-codegroup__panel">
			<pre><code>code ${i + 1}</code></pre>
		</div>
	`).join('');

	const el = document.createElement('div');
	el.setAttribute('data-rune', 'code-group');
	el.className = 'rf-codegroup';
	el.innerHTML = `
		<div data-name="topbar" class="rf-codegroup__topbar">
			<span class="rf-codegroup__dot"></span>
			<span class="rf-codegroup__dot"></span>
			<span class="rf-codegroup__dot"></span>
		</div>
		<div data-name="tabs" role="tablist" class="rf-codegroup__tabs">${tabs}</div>
		<div data-name="panels" class="rf-codegroup__panels">${panels}</div>
	`;
	document.body.appendChild(el);
	return el;
}

describe('tabsBehavior', () => {
	describe('ARIA wiring', () => {
		it('wires aria-controls and aria-labelledby', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll('[role="tab"]');
			const panels = el.querySelectorAll('[role="tabpanel"]');

			for (let i = 0; i < buttons.length; i++) {
				const controlsId = buttons[i].getAttribute('aria-controls');
				expect(controlsId).toBeTruthy();
				expect(panels[i].id).toBe(controlsId);
				expect(panels[i].getAttribute('aria-labelledby')).toBe(buttons[i].id);
			}
		});

		it('sets aria-selected on first tab button', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll('[role="tab"]');
			expect(buttons[0].getAttribute('aria-selected')).toBe('true');
			expect(buttons[1].getAttribute('aria-selected')).toBe('false');
		});

		it('adds --active class to first tab button', () => {
			const el = createCodeGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll('[role="tab"]');
			expect(buttons[0].classList.contains('rf-codegroup__tab--active')).toBe(true);
			expect(buttons[1].classList.contains('rf-codegroup__tab--active')).toBe(false);
		});
	});

	describe('panel switching', () => {
		it('shows only the first panel initially', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const panels = el.querySelectorAll('[role="tabpanel"]');
			expect(panels[0].hidden).toBe(false);
			expect(panels[1].hidden).toBe(true);
			expect(panels[2].hidden).toBe(true);
		});

		it('switches panel on tab button click', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll('[role="tab"]');
			const panels = el.querySelectorAll('[role="tabpanel"]');

			(buttons[1] as HTMLElement).click();

			expect(buttons[0].getAttribute('aria-selected')).toBe('false');
			expect(buttons[1].getAttribute('aria-selected')).toBe('true');
			expect(panels[0].hidden).toBe(true);
			expect(panels[1].hidden).toBe(false);
		});
	});

	describe('keyboard navigation', () => {
		it('ArrowRight moves focus to next tab', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll<HTMLElement>('[role="tab"]');
			buttons[0].focus();
			buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

			expect(document.activeElement).toBe(buttons[1]);
		});

		it('ArrowLeft moves focus to previous tab', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll<HTMLElement>('[role="tab"]');
			buttons[1].focus();
			buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

			expect(document.activeElement).toBe(buttons[0]);
		});

		it('ArrowRight wraps from last to first', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll<HTMLElement>('[role="tab"]');
			buttons[2].focus();
			buttons[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

			expect(document.activeElement).toBe(buttons[0]);
		});

		it('ArrowLeft wraps from first to last', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll<HTMLElement>('[role="tab"]');
			buttons[0].focus();
			buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

			expect(document.activeElement).toBe(buttons[2]);
		});

		it('Home moves focus to first tab', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll<HTMLElement>('[role="tab"]');
			buttons[2].focus();
			buttons[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

			expect(document.activeElement).toBe(buttons[0]);
		});

		it('End moves focus to last tab', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll<HTMLElement>('[role="tab"]');
			buttons[0].focus();
			buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

			expect(document.activeElement).toBe(buttons[2]);
		});

		it('keyboard navigation also activates the tab', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll<HTMLElement>('[role="tab"]');
			const panels = el.querySelectorAll('[role="tabpanel"]');

			buttons[0].focus();
			buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

			expect(buttons[1].getAttribute('aria-selected')).toBe('true');
			expect(panels[1].hidden).toBe(false);
		});
	});

	describe('cleanup', () => {
		it('removes ARIA attributes and restores panels on cleanup', () => {
			const el = createTabGroup();
			const cleanup = tabsBehavior(el);

			cleanup();

			// ARIA IDs should be removed from buttons
			const buttons = el.querySelectorAll('[role="tab"]');
			for (const btn of buttons) {
				expect(btn.id).toBe('');
				expect(btn.hasAttribute('aria-controls')).toBe(false);
				expect(btn.hasAttribute('aria-selected')).toBe(false);
			}

			// Panel items should be visible and ARIA removed
			const panelItems = el.querySelectorAll('[role="tabpanel"]');
			for (const item of panelItems) {
				expect((item as HTMLElement).hidden).toBe(false);
				expect(item.id).toBe('');
				expect(item.hasAttribute('aria-labelledby')).toBe(false);
			}
		});

		it('removes active class on cleanup', () => {
			const el = createCodeGroup();
			const cleanup = tabsBehavior(el);

			cleanup();

			const buttons = el.querySelectorAll('[role="tab"]');
			for (const btn of buttons) {
				expect(btn.classList.contains('rf-codegroup__tab--active')).toBe(false);
			}
		});
	});

	it('handles element with no tabs container', () => {
		const el = document.createElement('section');
		el.setAttribute('data-rune', 'tab-group');
		document.body.appendChild(el);

		const cleanup = tabsBehavior(el);
		cleanup();
	});

	it('handles tabs container with no button children', () => {
		const el = document.createElement('section');
		el.setAttribute('data-rune', 'tab-group');
		el.innerHTML = '<div data-name="tabs" role="tablist"></div><div data-name="panels"></div>';
		document.body.appendChild(el);

		const cleanup = tabsBehavior(el);
		cleanup();
	});
});
