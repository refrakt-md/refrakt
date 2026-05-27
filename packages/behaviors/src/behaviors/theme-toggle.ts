import type { CleanupFn } from '../types.js';

/**
 * Theme-mode toggle behavior (SPEC-073).
 *
 * Discovers `[data-theme-toggle]` buttons (layout chrome) and cycles
 * `auto → light → dark → auto` on click, in lockstep with the canonical
 * pre-paint script:
 * - persists the choice to `localStorage['rf-theme']`;
 * - applies it as `document.documentElement.dataset.theme` (removed for
 *   `auto`, so `@media (prefers-color-scheme)` takes over);
 * - reflects the current preference onto each button as `data-theme-pref`
 *   (the icon hook the theme styles).
 *
 * Tint-locked pages hide the toggle via CSS (`html[data-tint-lock="true"]
 * .rf-theme-toggle`), so no observer is needed here. The framework-agnostic
 * replacement for the old `ThemeToggle.svelte` component.
 */
type ThemePref = 'auto' | 'light' | 'dark';

function readPref(): ThemePref {
	try {
		const saved = localStorage.getItem('rf-theme');
		if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
	} catch (_) {
		// localStorage may be unavailable (private mode, file://, etc.).
	}
	return 'auto';
}

function applyPref(pref: ThemePref): void {
	const d = document.documentElement;
	if (pref === 'auto') delete d.dataset.theme;
	else d.dataset.theme = pref;
}

function labelFor(pref: ThemePref): string {
	return pref === 'auto' ? 'Theme: auto (system)' : pref === 'light' ? 'Theme: light' : 'Theme: dark';
}

export function themeToggleBehavior(container: HTMLElement | Document): CleanupFn {
	const buttons = Array.from(container.querySelectorAll<HTMLElement>('[data-theme-toggle]'));
	if (buttons.length === 0) return () => {};

	const reflect = (pref: ThemePref) => {
		const label = labelFor(pref);
		for (const btn of buttons) {
			btn.dataset.themePref = pref;
			btn.setAttribute('aria-label', label);
			btn.setAttribute('title', label);
		}
	};

	const cycle = () => {
		const cur = readPref();
		const next: ThemePref = cur === 'auto' ? 'light' : cur === 'light' ? 'dark' : 'auto';
		try {
			localStorage.setItem('rf-theme', next);
		} catch (_) {
			// Persist failures are silent — the in-tab change still applies.
		}
		applyPref(next);
		reflect(next);
	};

	// Sync the button icon/label to the saved preference (the pre-paint script
	// already applied `data-theme` before first paint).
	reflect(readPref());

	for (const btn of buttons) btn.addEventListener('click', cycle);
	return () => {
		for (const btn of buttons) btn.removeEventListener('click', cycle);
	};
}
