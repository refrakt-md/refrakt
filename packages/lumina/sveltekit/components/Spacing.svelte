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

	interface SpacingItem { name: string; value: string; }
	interface SpacingScaleData { unit: string; values: string[]; }
	interface ParsedSections {
		spacing: SpacingScaleData | null;
		radii: SpacingItem[];
		shadows: SpacingItem[];
	}

	function parseSections(): ParsedSections {
		const result: ParsedSections = { spacing: null, radii: [], shadows: [] };
		let currentSection = '';
		let unit = '';
		let scaleValues: string[] = [];

		const sectionsRef = tag.children.find(
			(c): c is SerializedTag => isTag(c) && c.attributes?.['data-name'] === 'sections'
		);
		if (!sectionsRef) return result;

		for (const child of sectionsRef.children) {
			if (!isTag(child)) continue;
			const attrs = child.attributes || {};

			if (attrs.sectionType) {
				currentSection = attrs.sectionType;
			} else if (attrs.section && attrs.entryType) {
				const section = attrs.section;
				if (section === 'spacing') {
					if (attrs.entryType === 'scale') {
						scaleValues = String(attrs.value).split(',').map((v: string) => v.trim());
					} else if (attrs.name === 'unit') {
						unit = attrs.value;
					}
				} else if (section === 'radius') {
					result.radii.push({ name: attrs.name || '', value: attrs.value || '' });
				} else if (section === 'shadows') {
					result.shadows.push({ name: attrs.name || '', value: attrs.value || '' });
				}
			}
		}

		if (unit || scaleValues.length > 0) {
			result.spacing = { unit, values: scaleValues };
		}

		return result;
	}

	const sections = parseSections();

	function numericPx(val: string): number {
		return parseFloat(val) || 0;
	}

	function multiplier(val: string, unit: string): string {
		const v = numericPx(val);
		const u = numericPx(unit);
		if (u <= 0) return '';
		const m = v / u;
		return `${m}×`;
	}

	function maxScale(values: string[]): number {
		return Math.max(...values.map(numericPx), 1);
	}
</script>

<section class="rf-spacing">
	{#if title}
		<h3 class="rf-spacing__title">{title}</h3>
	{/if}

	{#if sections.spacing}
		<div class="rf-spacing__section">
			<h4 class="rf-spacing__section-title">Spacing</h4>
			<div class="rf-spacing__scale">
				{#each sections.spacing.values as val}
					{@const px = numericPx(val)}
					{@const max = maxScale(sections.spacing?.values || [])}
					<div class="rf-spacing__scale-item">
						<div
							class="rf-spacing__scale-bar"
							style="width: {Math.max((px / max) * 100, 2)}%"
						></div>
						<span class="rf-spacing__scale-label">
							{val.includes('px') ? val : val + 'px'}
							{#if sections.spacing?.unit}
								<span class="rf-spacing__scale-multiplier">{multiplier(val, sections.spacing.unit)}</span>
							{/if}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if sections.radii.length > 0}
		<div class="rf-spacing__section">
			<h4 class="rf-spacing__section-title">Radius</h4>
			<div class="rf-spacing__radii">
				{#each sections.radii as item}
					<div class="rf-spacing__radius-item">
						<div
							class="rf-spacing__radius-sample"
							style="border-radius: {item.value}"
						></div>
						<span class="rf-spacing__radius-label">{item.name}</span>
						<span class="rf-spacing__radius-value">{item.value}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if sections.shadows.length > 0}
		<div class="rf-spacing__section">
			<h4 class="rf-spacing__section-title">Shadows</h4>
			<div class="rf-spacing__shadows">
				{#each sections.shadows as item}
					<div class="rf-spacing__shadow-item">
						<div
							class="rf-spacing__shadow-sample"
							style="box-shadow: {item.value}"
						></div>
						<span class="rf-spacing__shadow-label">{item.name}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
