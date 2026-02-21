import type { CleanupFn } from '../types.js';

const VIEWPORT_PRESETS: Record<string, { width: number | null; label: string }> = {
	mobile: { width: 375, label: '375px' },
	tablet: { width: 768, label: '768px' },
	desktop: { width: null, label: 'Full' },
};

/**
 * Preview behavior for `[data-rune="preview"]`.
 *
 * Creates a toolbar with:
 * - View toggle: switch between preview and source code views
 * - Viewport toggle: responsive viewport presets (mobile, tablet, desktop)
 * - Theme toggle: auto, light, dark theme modes
 *
 * Reads configuration from data attributes:
 * - `data-theme`: initial theme mode (default: 'auto')
 * - `data-responsive`: comma-separated viewport presets
 */
export function previewBehavior(el: HTMLElement): CleanupFn {
	const initialTheme = (el.getAttribute('data-theme') || 'auto') as 'auto' | 'light' | 'dark';
	const responsiveStr = el.getAttribute('data-responsive') || '';
	const responsivePresets = responsiveStr
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s in VIEWPORT_PRESETS);
	const hasResponsive = responsivePresets.length > 0;

	// Separate source element from content children
	const sourceEl = el.querySelector('[property="source"]') as HTMLElement | null;
	const contentChildren = Array.from(el.children).filter(
		(child) => child !== sourceEl && !(child as HTMLElement).matches?.('meta[property]'),
	) as HTMLElement[];

	const hasSource = sourceEl !== null;

	// State
	let view: 'preview' | 'code' = 'preview';
	let themeMode: 'auto' | 'light' | 'dark' = initialTheme;
	let activeViewport: string | null = hasResponsive
		? responsivePresets[responsivePresets.length - 1]
		: null;

	const cleanups: Array<() => void> = [];

	// Build toolbar
	const toolbar = document.createElement('div');
	toolbar.className = 'rf-preview__toolbar';

	const titleEl = document.createElement('span');
	titleEl.className = 'rf-preview__title';
	toolbar.appendChild(titleEl);

	const controls = document.createElement('div');
	controls.className = 'rf-preview__controls';
	toolbar.appendChild(controls);

	// View toggle buttons
	let viewPreviewBtn: HTMLButtonElement | null = null;
	let viewCodeBtn: HTMLButtonElement | null = null;
	if (hasSource) {
		const viewToggle = document.createElement('div');
		viewToggle.className = 'rf-preview__view-toggle';

		viewPreviewBtn = document.createElement('button');
		viewPreviewBtn.className = 'rf-preview__toggle-btn rf-preview__toggle-btn--active';
		viewPreviewBtn.setAttribute('aria-label', 'Preview');
		viewPreviewBtn.setAttribute('title', 'Preview');
		viewPreviewBtn.textContent = 'Preview';

		viewCodeBtn = document.createElement('button');
		viewCodeBtn.className = 'rf-preview__toggle-btn';
		viewCodeBtn.setAttribute('aria-label', 'View source');
		viewCodeBtn.setAttribute('title', 'View source');
		viewCodeBtn.textContent = 'Code';

		viewToggle.appendChild(viewPreviewBtn);
		viewToggle.appendChild(viewCodeBtn);
		controls.appendChild(viewToggle);

		const onPreview = () => { view = 'preview'; render(); };
		const onCode = () => { view = 'code'; render(); };
		viewPreviewBtn.addEventListener('click', onPreview);
		viewCodeBtn.addEventListener('click', onCode);
		cleanups.push(() => {
			viewPreviewBtn!.removeEventListener('click', onPreview);
			viewCodeBtn!.removeEventListener('click', onCode);
		});
	}

	// Viewport toggle buttons
	const viewportButtons: Map<string, HTMLButtonElement> = new Map();
	if (hasResponsive) {
		const viewportToggle = document.createElement('div');
		viewportToggle.className = 'rf-preview__viewport-toggle';

		for (const preset of responsivePresets) {
			const btn = document.createElement('button');
			btn.className = 'rf-preview__toggle-btn';
			btn.setAttribute('aria-label', `${VIEWPORT_PRESETS[preset].label} viewport`);
			btn.setAttribute('title', VIEWPORT_PRESETS[preset].label);
			btn.textContent = preset.charAt(0).toUpperCase() + preset.slice(1);

			const onClick = () => { activeViewport = preset; render(); };
			btn.addEventListener('click', onClick);
			cleanups.push(() => btn.removeEventListener('click', onClick));

			viewportToggle.appendChild(btn);
			viewportButtons.set(preset, btn);
		}

		controls.appendChild(viewportToggle);
	}

	// Theme toggle buttons
	const themeToggle = document.createElement('div');
	themeToggle.className = 'rf-preview__toggle';

	const themeOptions: Array<{ mode: 'auto' | 'light' | 'dark'; label: string; title: string }> = [
		{ mode: 'auto', label: 'Auto', title: 'System preference' },
		{ mode: 'light', label: 'Light', title: 'Light mode' },
		{ mode: 'dark', label: 'Dark', title: 'Dark mode' },
	];

	const themeButtons: Map<string, HTMLButtonElement> = new Map();
	for (const opt of themeOptions) {
		const btn = document.createElement('button');
		btn.className = 'rf-preview__toggle-btn';
		btn.setAttribute('aria-label', `${opt.label} theme`);
		btn.setAttribute('title', opt.title);
		btn.textContent = opt.label;

		const onClick = () => { themeMode = opt.mode; render(); };
		btn.addEventListener('click', onClick);
		cleanups.push(() => btn.removeEventListener('click', onClick));

		themeToggle.appendChild(btn);
		themeButtons.set(opt.mode, btn);
	}

	controls.appendChild(themeToggle);

	// Wrap content in canvas
	const canvas = document.createElement('div');
	canvas.className = 'rf-preview__canvas';

	// Wrap source in source panel
	let sourcePanel: HTMLDivElement | null = null;
	if (hasSource && sourceEl) {
		sourcePanel = document.createElement('div');
		sourcePanel.className = 'rf-preview__source';
		sourcePanel.appendChild(sourceEl);
	}

	// Viewport frame (if responsive)
	let viewportFrame: HTMLDivElement | null = null;
	let viewportLabel: HTMLSpanElement | null = null;
	if (hasResponsive) {
		viewportFrame = document.createElement('div');
		viewportFrame.className = 'rf-preview__viewport-frame';

		viewportLabel = document.createElement('span');
		viewportLabel.className = 'rf-preview__viewport-label';
		viewportLabel.hidden = true;
		viewportFrame.appendChild(viewportLabel);

		for (const child of contentChildren) {
			viewportFrame.appendChild(child);
		}
		canvas.appendChild(viewportFrame);
	} else {
		for (const child of contentChildren) {
			canvas.appendChild(child);
		}
	}

	// Insert into DOM
	el.appendChild(toolbar);
	if (sourcePanel) el.appendChild(sourcePanel);
	el.appendChild(canvas);

	function render() {
		// View toggle
		if (viewPreviewBtn && viewCodeBtn) {
			viewPreviewBtn.classList.toggle('rf-preview__toggle-btn--active', view === 'preview');
			viewCodeBtn.classList.toggle('rf-preview__toggle-btn--active', view === 'code');
		}
		if (sourcePanel) {
			sourcePanel.hidden = view !== 'code';
		}
		canvas.hidden = view === 'code' && hasSource;

		// Viewport toggle
		for (const [preset, btn] of viewportButtons) {
			btn.classList.toggle('rf-preview__toggle-btn--active', activeViewport === preset);
		}
		if (viewportFrame) {
			const width = activeViewport && VIEWPORT_PRESETS[activeViewport]
				? VIEWPORT_PRESETS[activeViewport].width
				: null;
			viewportFrame.classList.toggle('rf-preview__viewport-frame--constrained', !!width);
			viewportFrame.style.maxWidth = width ? `${width}px` : '';

			if (viewportLabel) {
				if (width && activeViewport) {
					viewportLabel.textContent = VIEWPORT_PRESETS[activeViewport].label;
					viewportLabel.hidden = false;
				} else {
					viewportLabel.hidden = true;
				}
			}
		}

		// Theme toggle
		for (const [mode, btn] of themeButtons) {
			btn.classList.toggle('rf-preview__toggle-btn--active', themeMode === mode);
		}
		const resolvedTheme = themeMode === 'auto' ? undefined : themeMode;
		if (resolvedTheme) {
			canvas.setAttribute('data-theme', resolvedTheme);
		} else {
			canvas.removeAttribute('data-theme');
		}
	}

	// Initial render
	render();

	return () => {
		cleanups.forEach((fn) => fn());

		// Restore DOM: move children back to el, remove toolbar/canvas/source wrappers
		if (sourceEl && sourcePanel) {
			el.appendChild(sourceEl);
		}
		for (const child of Array.from(viewportFrame?.children ?? canvas.children)) {
			if (child !== viewportLabel) {
				el.appendChild(child);
			}
		}

		toolbar.remove();
		canvas.remove();
		sourcePanel?.remove();
	};
}
