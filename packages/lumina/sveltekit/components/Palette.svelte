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
	const showContrast = meta(tag, 'showContrast') === 'true';
	const showA11y = meta(tag, 'showA11y') === 'true';
	const columnsStr = meta(tag, 'columns');
	const columns = columnsStr ? parseInt(columnsStr, 10) : 0;

	// Parse color entries and groups from the serialized grid div
	interface ColorEntry {
		name: string;
		values: string[];
		group: string;
	}

	interface ColorGroup {
		title: string;
		entries: ColorEntry[];
	}

	function parseEntries(): ColorGroup[] {
		const groups: ColorGroup[] = [];
		let currentGroup: ColorGroup = { title: '', entries: [] };
		groups.push(currentGroup);

		// Walk children of the grid ref div
		const gridRef = tag.children.find(
			(c): c is SerializedTag => isTag(c) && c.attributes?.['data-name'] === 'grid'
		);
		if (!gridRef) return groups;

		for (const child of gridRef.children) {
			if (!isTag(child)) continue;
			const attrs = child.attributes || {};

			if (attrs.groupTitle) {
				currentGroup = { title: attrs.groupTitle, entries: [] };
				groups.push(currentGroup);
			} else if (attrs.name && attrs.values) {
				const values = String(attrs.values).split(',').map(v => v.trim()).filter(Boolean);
				currentGroup.entries.push({
					name: attrs.name,
					values,
					group: attrs.group || '',
				});
			}
		}

		return groups.filter(g => g.entries.length > 0);
	}

	const colorGroups = parseEntries();

	// WCAG contrast ratio calculation
	function hexToRgb(hex: string): [number, number, number] | null {
		const clean = hex.replace('#', '');
		if (clean.length !== 6 && clean.length !== 3) return null;
		const full = clean.length === 3
			? clean.split('').map(c => c + c).join('')
			: clean;
		const num = parseInt(full, 16);
		return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
	}

	function relativeLuminance(r: number, g: number, b: number): number {
		const [rs, gs, bs] = [r, g, b].map(c => {
			const s = c / 255;
			return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
	}

	function contrastRatio(hex: string, bgHex: string): number {
		const rgb1 = hexToRgb(hex);
		const rgb2 = hexToRgb(bgHex);
		if (!rgb1 || !rgb2) return 0;
		const l1 = relativeLuminance(...rgb1);
		const l2 = relativeLuminance(...rgb2);
		const lighter = Math.max(l1, l2);
		const darker = Math.min(l1, l2);
		return (lighter + 0.05) / (darker + 0.05);
	}

	function textColorFor(hex: string): string {
		const rgb = hexToRgb(hex);
		if (!rgb) return '#000';
		const lum = relativeLuminance(...rgb);
		return lum > 0.179 ? '#000' : '#fff';
	}

	function autoColumns(count: number): number {
		if (columns > 0) return columns;
		if (count <= 3) return count;
		if (count <= 6) return 3;
		if (count <= 8) return 4;
		return 5;
	}
</script>

<section class="rf-palette">
	{#if title}
		<h3 class="rf-palette__title">{title}</h3>
	{/if}

	{#each colorGroups as group}
		<div class="rf-palette__group">
			{#if group.title}
				<h4 class="rf-palette__group-title">{group.title}</h4>
			{/if}

			{#each group.entries as entry}
				{#if entry.values.length > 1}
					<!-- Neutral scale: renders as a horizontal gradient strip -->
					<div class="rf-palette__scale">
						{#each entry.values as value}
							<div
								class="rf-palette__scale-stop"
								style="background-color: {value}; color: {textColorFor(value)}"
							>
								<span class="rf-palette__swatch-value">{value}</span>
							</div>
						{/each}
						<span class="rf-palette__swatch-name">{entry.name}</span>
					</div>
				{:else}
					<!-- Single color swatch -->
					<div class="rf-palette__grid" style="--rf-palette-cols: {autoColumns(group.entries.filter(e => e.values.length <= 1).length)}">
						<div class="rf-palette__swatch">
							<div
								class="rf-palette__swatch-color"
								style="background-color: {entry.values[0]}"
							></div>
							<span class="rf-palette__swatch-name">{entry.name}</span>
							<span class="rf-palette__swatch-value">{entry.values[0]}</span>
							{#if showContrast || showA11y}
								{@const onWhite = contrastRatio(entry.values[0], '#FFFFFF')}
								{@const onBlack = contrastRatio(entry.values[0], '#000000')}
								{#if showContrast}
									<span class="rf-palette__swatch-contrast">
										W: {onWhite.toFixed(1)} · B: {onBlack.toFixed(1)}
									</span>
								{/if}
								{#if showA11y}
									<span class="rf-palette__swatch-a11y">
										<span class="rf-palette__swatch-a11y--{onWhite >= 4.5 ? 'pass' : 'fail'}">AA {onWhite >= 4.5 ? '✓' : '✗'}</span>
										<span class="rf-palette__swatch-a11y--{onWhite >= 7 ? 'pass' : 'fail'}">AAA {onWhite >= 7 ? '✓' : '✗'}</span>
									</span>
								{/if}
							{/if}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/each}
</section>
