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
	const rune = opts?.rune ?? 'tabgroup';

	const tabs = Array.from({ length: count }, (_, i) => `
		<li typeof="Tab" data-rune="tab">
			<span property="name">Tab ${i + 1}</span>
		</li>
	`).join('');

	const panels = Array.from({ length: count }, (_, i) => `
		<li typeof="TabPanel">
			<div>Content ${i + 1}</div>
		</li>
	`).join('');

	const el = document.createElement('section');
	el.setAttribute('data-rune', rune);
	el.className = rune === 'codegroup' ? 'rf-codegroup' : 'rf-tabs';
	el.innerHTML = `
		<ul data-name="tabs">${tabs}</ul>
		<ul data-name="panels">${panels}</ul>
	`;
	document.body.appendChild(el);
	return el;
}

function createCodeGroup(opts?: { tabCount?: number }): HTMLElement {
	const count = opts?.tabCount ?? 2;

	const tabs = Array.from({ length: count }, (_, i) => `
		<li typeof="Tab" data-rune="tab">
			<span property="name">file${i + 1}.ts</span>
		</li>
	`).join('');

	const panels = Array.from({ length: count }, (_, i) => `
		<li typeof="TabPanel">
			<pre><code>code ${i + 1}</code></pre>
		</li>
	`).join('');

	const el = document.createElement('div');
	el.setAttribute('data-rune', 'codegroup');
	el.className = 'rf-codegroup';
	el.innerHTML = `
		<div data-name="topbar" class="rf-codegroup__topbar">
			<span class="rf-codegroup__dot"></span>
			<span class="rf-codegroup__dot"></span>
			<span class="rf-codegroup__dot"></span>
		</div>
		<ul data-name="tabs">${tabs}</ul>
		<ul data-name="panels">${panels}</ul>
	`;
	document.body.appendChild(el);
	return el;
}

describe('tabsBehavior', () => {
	describe('tablist creation', () => {
		it('creates a tablist with buttons', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const tablist = el.querySelector('[role="tablist"]');
			expect(tablist).not.toBeNull();

			const buttons = tablist!.querySelectorAll('[role="tab"]');
			expect(buttons.length).toBe(3);
			expect(buttons[0].textContent).toBe('Tab 1');
			expect(buttons[1].textContent).toBe('Tab 2');
			expect(buttons[2].textContent).toBe('Tab 3');
		});

		it('uses rf-tabs__bar class for tabgroup', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const tablist = el.querySelector('[role="tablist"]');
			expect(tablist!.className).toBe('rf-tabs__bar');
		});

		it('uses rf-codegroup__tabs class for codegroup', () => {
			const el = createCodeGroup();
			tabsBehavior(el);

			const tablist = el.querySelector('[role="tablist"]');
			expect(tablist!.className).toBe('rf-codegroup__tabs');
		});

		it('inserts tab bar after topbar for codegroup', () => {
			const el = createCodeGroup();
			tabsBehavior(el);

			const topbar = el.querySelector('[data-name="topbar"]');
			const tablist = el.querySelector('[role="tablist"]');
			expect(topbar!.nextElementSibling).toBe(tablist);
		});
	});

	describe('ARIA attributes', () => {
		it('sets aria-selected on first tab button', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const buttons = el.querySelectorAll('[role="tab"]');
			expect(buttons[0].getAttribute('aria-selected')).toBe('true');
			expect(buttons[1].getAttribute('aria-selected')).toBe('false');
		});

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

		it('hides Tab label items', () => {
			const el = createTabGroup();
			tabsBehavior(el);

			const tabItems = el.querySelectorAll('[typeof="Tab"]');
			for (const item of tabItems) {
				expect((item as HTMLElement).hidden).toBe(true);
			}
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
		it('removes tab bar and restores DOM on cleanup', () => {
			const el = createTabGroup();
			const cleanup = tabsBehavior(el);

			expect(el.querySelector('[role="tablist"]')).not.toBeNull();

			cleanup();

			expect(el.querySelector('[role="tablist"]')).toBeNull();

			// Tab items should be visible again
			const tabItems = el.querySelectorAll('[typeof="Tab"]');
			for (const item of tabItems) {
				expect((item as HTMLElement).hidden).toBe(false);
			}

			// Panel items should be visible again
			const panelItems = el.querySelectorAll('[typeof="TabPanel"]');
			for (const item of panelItems) {
				expect((item as HTMLElement).hidden).toBe(false);
			}
		});

		it('removes event listeners on cleanup', () => {
			const el = createTabGroup();
			const cleanup = tabsBehavior(el);

			cleanup();

			// Tab bar is removed so no more buttons to click
			expect(el.querySelector('[role="tablist"]')).toBeNull();
		});
	});

	it('handles element with no ul', () => {
		const el = document.createElement('section');
		el.setAttribute('data-rune', 'tabgroup');
		document.body.appendChild(el);

		const cleanup = tabsBehavior(el);
		cleanup();
	});

	it('handles ul with no Tab/TabPanel items', () => {
		const el = document.createElement('section');
		el.setAttribute('data-rune', 'tabgroup');
		el.innerHTML = '<ul><li>Regular item</li></ul>';
		document.body.appendChild(el);

		const cleanup = tabsBehavior(el);
		cleanup();
	});
});
