<script lang="ts">
	import 'virtual:refrakt/tokens';
	import '../styles/brand.css';

	let { data, children } = $props();

	// Re-apply the route's tint cascade to <html> on every client-side
	// navigation. SvelteKit reuses the same <html> across navigations, so a
	// `data-theme` written by the theme toggle on an unlocked page would
	// otherwise leak into a locked page on the next navigation. Depending on
	// `data.tintCascade` (which changes per route via +layout.server.ts) gives
	// us the per-nav re-run. The toggle itself is now layout chrome enhanced by
	// the `theme-toggle` behavior (SPEC-073) — no component to mount here.
	$effect(() => {
		const cascade = data.tintCascade;
		const html = document.documentElement;

		if (cascade.locked && (cascade.tintMode === 'light' || cascade.tintMode === 'dark')) {
			html.setAttribute('data-theme', cascade.tintMode);
			html.setAttribute('data-tint-lock', 'true');
		} else {
			html.removeAttribute('data-tint-lock');
			let saved: string | null = null;
			try {
				saved = localStorage.getItem('rf-theme');
			} catch (_) {
				// localStorage may be unavailable (private mode, file://).
			}
			const mode =
				saved === 'light' || saved === 'dark'
					? saved
					: matchMedia('(prefers-color-scheme: dark)').matches
						? 'dark'
						: 'light';
			html.setAttribute('data-theme', mode);
		}

		if (cascade.tint !== null && cascade.tint !== undefined) {
			html.setAttribute('data-tint', String(cascade.tint));
		} else {
			html.removeAttribute('data-tint');
		}
	});
</script>

<div class="site-layout">
	{@render children()}
</div>
