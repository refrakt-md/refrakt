<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	function isTag(n: RendererNode): n is SerializedTag {
		return n !== null && typeof n === 'object' && !Array.isArray(n) && (n as any).$$mdtype === 'Tag';
	}

	function meta(node: SerializedTag, prop: string): string {
		const child = node.children.find(
			(c): c is SerializedTag => isTag(c) && c.name === 'meta' && c.attributes?.property === prop
		);
		return child?.attributes?.content ?? '';
	}

	const title = meta(tag, 'title');
	const sample = meta(tag, 'sample') || 'The quick brown fox jumps over the lazy dog';
	const showSizes = meta(tag, 'showSizes') !== 'false';
	const showWeights = meta(tag, 'showWeights') !== 'false';
	const showCharset = meta(tag, 'showCharset') === 'true';

	interface Specimen {
		role: string;
		family: string;
		weights: number[];
	}

	const SIZES = [48, 32, 24, 18, 14];
	const WEIGHT_NAMES: Record<number, string> = {
		100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular',
		500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
	};
	const CHARSET = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz 0123456789 !@#$%^&*()';

	const ROLE_FALLBACKS: Record<string, string> = {
		heading: 'sans-serif',
		body: 'sans-serif',
		mono: 'monospace',
		display: 'sans-serif',
		caption: 'sans-serif',
	};

	function parseSpecimens(): Specimen[] {
		const specimens: Specimen[] = [];
		const specimensRef = tag.children.find(
			(c): c is SerializedTag => isTag(c) && c.attributes?.['data-name'] === 'specimens'
		);
		if (!specimensRef) return specimens;

		for (const child of specimensRef.children) {
			if (!isTag(child)) continue;
			const attrs = child.attributes || {};
			if (attrs.role && attrs.family) {
				const weights = attrs.weights
					? String(attrs.weights).split(',').map((w: string) => parseInt(w.trim(), 10)).filter((w: number) => !isNaN(w))
					: [400];
				specimens.push({ role: attrs.role, family: attrs.family, weights });
			}
		}
		return specimens;
	}

	const specimens = parseSpecimens();

	// Build Google Fonts URL
	function buildFontsUrl(): string {
		if (specimens.length === 0) return '';
		const families = specimens.map(s => {
			const name = s.family.replace(/ /g, '+');
			const weights = s.weights.sort((a, b) => a - b).join(';');
			return `family=${name}:wght@${weights}`;
		});
		return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
	}

	const fontsUrl = buildFontsUrl();

	function fontStack(specimen: Specimen): string {
		const fallback = ROLE_FALLBACKS[specimen.role] || 'sans-serif';
		return `'${specimen.family}', ${fallback}`;
	}
</script>

<svelte:head>
	{#if fontsUrl}
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
		<link href={fontsUrl} rel="stylesheet">
	{/if}
</svelte:head>

<section class="rf-typography">
	{#if title}
		<h3 class="rf-typography__title">{title}</h3>
	{/if}

	<div class="rf-typography__specimens">
		{#each specimens as specimen}
			<div class="rf-typography__specimen">
				<div class="rf-typography__specimen-header">
					<span class="rf-typography__specimen-role">{specimen.role}</span>
					<span class="rf-typography__specimen-family">{specimen.family}</span>
				</div>

				{#if showSizes}
					<div class="rf-typography__sizes">
						{#each SIZES as size}
							<div class="rf-typography__size-sample" style="font-family: {fontStack(specimen)}; font-size: {size}px; font-weight: {specimen.weights[0]}">
								{size <= 18 ? sample : sample.slice(0, Math.floor(60 / (size / 14)))}
								<span class="rf-typography__size-label">{size}px</span>
							</div>
						{/each}
					</div>
				{/if}

				{#if showWeights && specimen.weights.length > 1}
					<div class="rf-typography__weights">
						{#each specimen.weights as weight}
							<div class="rf-typography__weight-sample" style="font-family: {fontStack(specimen)}; font-weight: {weight}">
								<span class="rf-typography__weight-label">{weight} — {WEIGHT_NAMES[weight] || weight}</span>
								<span style="font-size: 24px">Aa Bb Cc</span>
							</div>
						{/each}
					</div>
				{/if}

				{#if showCharset}
					<div class="rf-typography__charset" style="font-family: {fontStack(specimen)}; font-weight: {specimen.weights[0]}">
						{CHARSET}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>
