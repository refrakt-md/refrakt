/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { previewBehavior } from '../src/behaviors/preview.js';

beforeEach(() => {
	document.body.innerHTML = '';
});

function createPreview(opts?: {
	theme?: string;
	responsive?: string;
	hasSource?: boolean;
}): HTMLElement {
	const el = document.createElement('div');
	el.setAttribute('data-rune', 'preview');
	el.className = 'rf-preview';

	if (opts?.theme) el.setAttribute('data-theme', opts.theme);
	if (opts?.responsive) el.setAttribute('data-responsive', opts.responsive);

	if (opts?.hasSource) {
		const source = document.createElement('div');
		source.setAttribute('property', 'source');
		source.innerHTML = '<pre><code>const x = 1;</code></pre>';
		el.appendChild(source);
	}

	const content = document.createElement('div');
	content.className = 'preview-content';
	content.textContent = 'Preview content here';
	el.appendChild(content);

	document.body.appendChild(el);
	return el;
}

describe('previewBehavior', () => {
	describe('toolbar creation', () => {
		it('creates a toolbar', () => {
			const el = createPreview();
			previewBehavior(el);

			expect(el.querySelector('.rf-preview__toolbar')).not.toBeNull();
			expect(el.querySelector('.rf-preview__controls')).not.toBeNull();
		});

		it('creates theme toggle buttons with SVG icons', () => {
			const el = createPreview();
			previewBehavior(el);

			const themeToggle = el.querySelector('.rf-preview__toggle');
			expect(themeToggle).not.toBeNull();

			const buttons = themeToggle!.querySelectorAll('button');
			expect(buttons.length).toBe(3);
			expect(buttons[0].querySelector('svg')).not.toBeNull();
			expect(buttons[1].querySelector('svg')).not.toBeNull();
			expect(buttons[2].querySelector('svg')).not.toBeNull();
			expect(buttons[0].getAttribute('aria-label')).toBe('Auto theme');
			expect(buttons[1].getAttribute('aria-label')).toBe('Light theme');
			expect(buttons[2].getAttribute('aria-label')).toBe('Dark theme');
		});
	});

	describe('view toggle', () => {
		it('creates view toggle when source is present', () => {
			const el = createPreview({ hasSource: true });
			previewBehavior(el);

			const viewToggle = el.querySelector('.rf-preview__view-toggle');
			expect(viewToggle).not.toBeNull();

			const buttons = viewToggle!.querySelectorAll('button');
			expect(buttons.length).toBe(2);
		});

		it('does not create view toggle when no source', () => {
			const el = createPreview();
			previewBehavior(el);

			expect(el.querySelector('.rf-preview__view-toggle')).toBeNull();
		});

		it('switches to code view on button click', () => {
			const el = createPreview({ hasSource: true });
			previewBehavior(el);

			const viewToggle = el.querySelector('.rf-preview__view-toggle')!;
			const codeBtn = viewToggle.querySelectorAll('button')[1]; // Code button
			codeBtn.click();

			const source = el.querySelector('.rf-preview__source') as HTMLElement;
			const canvas = el.querySelector('.rf-preview__canvas') as HTMLElement;

			expect(source.hidden).toBe(false);
			expect(canvas.hidden).toBe(true);
		});

		it('switches back to preview view', () => {
			const el = createPreview({ hasSource: true });
			previewBehavior(el);

			const viewToggle = el.querySelector('.rf-preview__view-toggle')!;
			const buttons = viewToggle.querySelectorAll('button');

			buttons[1].click(); // Code
			buttons[0].click(); // Preview

			const source = el.querySelector('.rf-preview__source') as HTMLElement;
			const canvas = el.querySelector('.rf-preview__canvas') as HTMLElement;

			expect(source.hidden).toBe(true);
			expect(canvas.hidden).toBe(false);
		});

		it('marks active view button', () => {
			const el = createPreview({ hasSource: true });
			previewBehavior(el);

			const viewToggle = el.querySelector('.rf-preview__view-toggle')!;
			const buttons = viewToggle.querySelectorAll('button');

			expect(buttons[0].classList.contains('rf-preview__toggle-btn--active')).toBe(true);
			expect(buttons[1].classList.contains('rf-preview__toggle-btn--active')).toBe(false);

			buttons[1].click();

			expect(buttons[0].classList.contains('rf-preview__toggle-btn--active')).toBe(false);
			expect(buttons[1].classList.contains('rf-preview__toggle-btn--active')).toBe(true);
		});
	});

	describe('theme toggle', () => {
		it('sets data-theme on canvas when selecting light', () => {
			const el = createPreview();
			previewBehavior(el);

			const themeToggle = el.querySelector('.rf-preview__toggle')!;
			const lightBtn = themeToggle.querySelectorAll('button')[1];
			lightBtn.click();

			const canvas = el.querySelector('.rf-preview__canvas')!;
			expect(canvas.getAttribute('data-theme')).toBe('light');
		});

		it('sets data-theme on canvas when selecting dark', () => {
			const el = createPreview();
			previewBehavior(el);

			const themeToggle = el.querySelector('.rf-preview__toggle')!;
			const darkBtn = themeToggle.querySelectorAll('button')[2];
			darkBtn.click();

			const canvas = el.querySelector('.rf-preview__canvas')!;
			expect(canvas.getAttribute('data-theme')).toBe('dark');
		});

		it('removes data-theme when selecting auto', () => {
			const el = createPreview({ theme: 'dark' });
			previewBehavior(el);

			const themeToggle = el.querySelector('.rf-preview__toggle')!;
			const autoBtn = themeToggle.querySelectorAll('button')[0];
			autoBtn.click();

			const canvas = el.querySelector('.rf-preview__canvas')!;
			expect(canvas.getAttribute('data-theme')).toBeNull();
		});

		it('marks active theme button', () => {
			const el = createPreview();
			previewBehavior(el);

			const themeToggle = el.querySelector('.rf-preview__toggle')!;
			const buttons = themeToggle.querySelectorAll('button');

			// Auto is active by default
			expect(buttons[0].classList.contains('rf-preview__toggle-btn--active')).toBe(true);

			buttons[2].click(); // Dark

			expect(buttons[0].classList.contains('rf-preview__toggle-btn--active')).toBe(false);
			expect(buttons[2].classList.contains('rf-preview__toggle-btn--active')).toBe(true);
		});
	});

	describe('viewport toggle', () => {
		it('creates viewport toggle when responsive presets exist', () => {
			const el = createPreview({ responsive: 'mobile,tablet,desktop' });
			previewBehavior(el);

			const viewportToggle = el.querySelector('.rf-preview__viewport-toggle');
			expect(viewportToggle).not.toBeNull();

			const buttons = viewportToggle!.querySelectorAll('button');
			expect(buttons.length).toBe(3);
		});

		it('does not create viewport toggle when no responsive presets', () => {
			const el = createPreview();
			previewBehavior(el);

			expect(el.querySelector('.rf-preview__viewport-toggle')).toBeNull();
		});

		it('sets max-width on viewport frame for mobile', () => {
			const el = createPreview({ responsive: 'mobile,tablet,desktop' });
			previewBehavior(el);

			const viewportToggle = el.querySelector('.rf-preview__viewport-toggle')!;
			const mobileBtn = viewportToggle.querySelectorAll('button')[0];
			mobileBtn.click();

			const frame = el.querySelector('.rf-preview__viewport-frame') as HTMLElement;
			expect(frame.style.maxWidth).toBe('375px');
			expect(frame.classList.contains('rf-preview__viewport-frame--constrained')).toBe(true);
		});

		it('removes max-width for desktop viewport', () => {
			const el = createPreview({ responsive: 'mobile,tablet,desktop' });
			previewBehavior(el);

			const viewportToggle = el.querySelector('.rf-preview__viewport-toggle')!;
			const buttons = viewportToggle.querySelectorAll('button');

			buttons[0].click(); // Mobile (constrained)
			buttons[2].click(); // Desktop (unconstrained)

			const frame = el.querySelector('.rf-preview__viewport-frame') as HTMLElement;
			expect(frame.style.maxWidth).toBe('');
			expect(frame.classList.contains('rf-preview__viewport-frame--constrained')).toBe(false);
		});

		it('shows viewport label when constrained', () => {
			const el = createPreview({ responsive: 'mobile,desktop' });
			previewBehavior(el);

			const viewportToggle = el.querySelector('.rf-preview__viewport-toggle')!;
			const mobileBtn = viewportToggle.querySelectorAll('button')[0];
			mobileBtn.click();

			const label = el.querySelector('.rf-preview__viewport-label') as HTMLElement;
			expect(label.hidden).toBe(false);
			expect(label.textContent).toBe('375px');
		});

		it('defaults to last responsive preset', () => {
			const el = createPreview({ responsive: 'mobile,tablet,desktop' });
			previewBehavior(el);

			const viewportToggle = el.querySelector('.rf-preview__viewport-toggle')!;
			const buttons = viewportToggle.querySelectorAll('button');

			// Desktop (last) should be active
			expect(buttons[2].classList.contains('rf-preview__toggle-btn--active')).toBe(true);
		});
	});

	describe('canvas', () => {
		it('wraps content in canvas element', () => {
			const el = createPreview();
			previewBehavior(el);

			const canvas = el.querySelector('.rf-preview__canvas');
			expect(canvas).not.toBeNull();
			expect(canvas!.textContent).toContain('Preview content here');
		});

		it('wraps content in viewport frame when responsive', () => {
			const el = createPreview({ responsive: 'mobile,desktop' });
			previewBehavior(el);

			const frame = el.querySelector('.rf-preview__viewport-frame');
			expect(frame).not.toBeNull();
			expect(frame!.textContent).toContain('Preview content here');
		});
	});

	describe('cleanup', () => {
		it('removes toolbar and restores children', () => {
			const el = createPreview({ hasSource: true, responsive: 'mobile,desktop' });
			const cleanup = previewBehavior(el);

			expect(el.querySelector('.rf-preview__toolbar')).not.toBeNull();

			cleanup();

			expect(el.querySelector('.rf-preview__toolbar')).toBeNull();
			expect(el.querySelector('.rf-preview__canvas')).toBeNull();
			expect(el.querySelector('.rf-preview__source')).toBeNull();

			// Source and content should be back in el
			expect(el.querySelector('[property="source"]')).not.toBeNull();
			expect(el.querySelector('.preview-content')).not.toBeNull();
		});
	});

	it('handles element with no children', () => {
		const el = document.createElement('div');
		el.setAttribute('data-rune', 'preview');
		document.body.appendChild(el);

		const cleanup = previewBehavior(el);
		cleanup();
	});
});
