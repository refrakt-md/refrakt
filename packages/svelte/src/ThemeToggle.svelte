<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * Theme toggle — three-state button cycling auto → light → dark → auto.
	 *
	 * Reads and writes the `rf-theme` localStorage key in lockstep with the
	 * canonical pre-paint script (see `prePaintScript()` in
	 * `@refrakt-md/content`). On click, applies the new value as
	 * `document.documentElement.dataset.theme` so the change takes effect
	 * immediately without a page reload.
	 *
	 * **Locked pages** (`<html data-tint-lock="true">`, set by the cascade
	 * SSR per SPEC-052) hide the toggle entirely — the saved preference is
	 * preserved in localStorage but ignored while the lock is active, and
	 * surfacing a toggle that does nothing would be confusing.
	 *
	 * Used by any refrakt site rendering through `@refrakt-md/svelte`. The
	 * default rendering is a small inline button labelled with an icon and
	 * a tooltip; override via `class` or a `children` snippet for custom
	 * presentation while keeping the behaviour.
	 */
	type ThemePref = 'auto' | 'light' | 'dark';

	let {
		class: className = '',
		children,
	}: { class?: string; children?: import('svelte').Snippet<[{ pref: ThemePref }]> } = $props();

	let pref = $state<ThemePref>('auto');
	let locked = $state(false);
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
		locked = document.documentElement.dataset.tintLock === 'true';

		try {
			const saved = localStorage.getItem('rf-theme') as ThemePref | null;
			if (saved === 'light' || saved === 'dark' || saved === 'auto') {
				pref = saved;
			}
		} catch (_) {
			// localStorage may be unavailable (private mode, file://, etc.).
		}

		// Watch for changes to data-tint-lock during client-side navigation —
		// SvelteKit may rewrite this attribute when navigating between pages
		// with different cascade states.
		const observer = new MutationObserver(() => {
			locked = document.documentElement.dataset.tintLock === 'true';
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tint-lock'] });
		return () => observer.disconnect();
	});

	function cycle() {
		const next: ThemePref = pref === 'auto' ? 'light' : pref === 'light' ? 'dark' : 'auto';
		pref = next;
		try {
			localStorage.setItem('rf-theme', next);
		} catch (_) {
			// Persist failures are silent — UI still works in-tab.
		}
		applyPref(next);
	}

	function applyPref(p: ThemePref) {
		const d = document.documentElement;
		if (p === 'auto') {
			// Remove the explicit attribute; the @media (prefers-color-scheme)
			// rule takes over.
			delete d.dataset.theme;
			return;
		}
		d.dataset.theme = p;
	}

	const label = $derived(
		pref === 'auto' ? 'Theme: auto (system)' : pref === 'light' ? 'Theme: light' : 'Theme: dark',
	);
</script>

{#if mounted && !locked}
	<button
		type="button"
		class="rf-theme-toggle {className}"
		data-theme-pref={pref}
		aria-label={label}
		title={label}
		onclick={cycle}
	>
		{#if children}
			{@render children({ pref })}
		{:else}
			<span aria-hidden="true" class="rf-theme-toggle__icon rf-theme-toggle__icon--{pref}"></span>
		{/if}
	</button>
{/if}

<style>
	.rf-theme-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid var(--rf-color-border, transparent);
		border-radius: var(--rf-radius-md, 8px);
		background: transparent;
		color: var(--rf-color-text);
		cursor: pointer;
		transition: background-color 120ms ease, border-color 120ms ease;
	}

	.rf-theme-toggle:hover {
		background: var(--rf-color-surface-hover, rgba(0, 0, 0, 0.04));
	}

	.rf-theme-toggle:focus-visible {
		outline: 2px solid var(--rf-color-primary);
		outline-offset: 2px;
	}

	.rf-theme-toggle__icon {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		background: currentColor;
		mask-size: contain;
		mask-repeat: no-repeat;
		mask-position: center;
	}

	.rf-theme-toggle__icon--auto {
		mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 2a10 10 0 0 0 0 20Z' fill='currentColor'/></svg>");
	}

	.rf-theme-toggle__icon--light {
		mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41'/></svg>");
	}

	.rf-theme-toggle__icon--dark {
		mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'/></svg>");
	}
</style>
