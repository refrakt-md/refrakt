<script lang="ts" module>
	export const TOOLBAR_ATTR_NAMES = new Set([
		'width', 'spacing', 'align', 'justify', 'layout', 'gap', 'tint-mode',
	]);
</script>

<script lang="ts">
	import type { RuneAttributeInfo } from '../api/client.js';

	interface Props {
		schema: Record<string, RuneAttributeInfo>;
		attributes: Record<string, string>;
		onchange: (attrs: Record<string, string>) => void;
	}

	let { schema, attributes, onchange }: Props = $props();

	interface ToolbarItem {
		name: string;
		label: string;
		icons: Record<string, string>; // value → SVG path
		defaultIcon: string; // icon when unset
	}

	const TOOLBAR_ITEMS: ToolbarItem[] = [
		{
			name: 'width',
			label: 'Width',
			defaultIcon: 'M4 4h8v8H4z',
			icons: {
				content: 'M4 4h8v8H4z',
				wide: 'M2 4h12v8H2z',
				full: 'M0.5 4h15v8H0.5z',
			},
		},
		{
			name: 'spacing',
			label: 'Spacing',
			defaultIcon: 'M2 4h12M2 8h12M2 12h12',
			icons: {
				flush: 'M2 3h12M2 6h12M2 9h12M2 12h12',
				tight: 'M2 3.5h12M2 6.5h12M2 9.5h12M2 12.5h12',
				default: 'M2 4h12M2 8h12M2 12h12',
				loose: 'M2 3h12M2 8h12M2 13h12',
				breathe: 'M2 2h12M2 8h12M2 14h12',
			},
		},
		{
			name: 'align',
			label: 'Align',
			defaultIcon: 'M1 1h14v14H1zM4 3.5h8M4 5.5h5',
			icons: {
				start: 'M1 1h14v14H1zM4 3.5h8M4 5.5h5',
				center: 'M1 1h14v14H1zM4 6.5h8M4 8.5h5',
				end: 'M1 1h14v14H1zM4 9.5h8M4 11.5h5',
			},
		},
		{
			name: 'justify',
			label: 'Justify',
			defaultIcon: 'M2 3h8M2 6h12M2 9h5',
			icons: {
				left: 'M2 3h8M2 6h12M2 9h5',
				center: 'M4 3h8M2 6h12M5.5 9h5',
				right: 'M6 3h8M2 6h12M9 9h5',
			},
		},
		{
			name: 'layout',
			label: 'Layout',
			defaultIcon: 'M2 2h12v12H2z',
			icons: {
				stacked: 'M2 2h12v12H2z',
				split: 'M2 2h5v12H2zM9 2h5v12H9z',
				'split-reverse': 'M2 2h5v12H2zM9 2h5v12H9zM3 8l2-1.5v3zM13 8l-2-1.5v3z',
			},
		},
		{
			name: 'gap',
			label: 'Gap',
			defaultIcon: 'M2 2h5v12H2zM9 2h5v12H9z',
			icons: {
				none: 'M2 2h6v12H2zM8 2h6v12H8z',
				tight: 'M2 2h5.5v12H2zM8.5 2h5.5v12H8.5z',
				default: 'M2 2h5v12H2zM9 2h5v12H9z',
				loose: 'M2 2h4.5v12H2zM9.5 2h4.5v12H9.5z',
			},
		},
		{
			name: 'tint-mode',
			label: 'Colour mode',
			defaultIcon: 'M8 2a6 6 0 1 1 0 12a6 6 0 0 1 0-12zM8 2v12',
			icons: {
				auto: 'M8 2a6 6 0 1 1 0 12a6 6 0 0 1 0-12zM8 2v12',
				dark: 'M10 2.5a6 6 0 1 0 0 11a5 5 0 0 1 0-11z',
				light: 'M8 5a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM8 1v1M8 14v1M1 8h1M14 8h1M3.1 3.1l.7.7M12.2 12.2l.7.7M12.2 3.1l-.7.7M3.1 12.2l-.7.7',
			},
		},
	];

	// Filter to only items present in the rune's schema
	let activeItems = $derived(
		TOOLBAR_ITEMS.filter(item => item.name in schema)
	);

	let openDropdown: string | null = $state(null);
	let toolbarEl: HTMLDivElement;

	function toggleDropdown(name: string) {
		openDropdown = openDropdown === name ? null : name;
	}

	function selectValue(name: string, value: string) {
		const next = { ...attributes };
		if (value === '') {
			delete next[name];
		} else {
			next[name] = value;
		}
		onchange(next);
		openDropdown = null;
	}

	function getIcon(item: ToolbarItem, value: string): string {
		return item.icons[value] || item.defaultIcon;
	}

	function handleClickOutside(e: MouseEvent) {
		if (openDropdown && toolbarEl && !toolbarEl.contains(e.target as Node)) {
			openDropdown = null;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && openDropdown) {
			openDropdown = null;
			e.stopPropagation();
		}
	}
</script>

<svelte:window onmousedown={handleClickOutside} onkeydown={handleKeydown} />

{#if activeItems.length > 0}
	<div class="layout-toolbar" bind:this={toolbarEl}>
		{#each activeItems as item (item.name)}
			{@const value = attributes[item.name] ?? ''}
			{@const isOpen = openDropdown === item.name}
			<div class="layout-toolbar__item">
				<button
					type="button"
					class="layout-toolbar__btn"
					class:active={!!value}
					class:open={isOpen}
					title="{item.label}: {value || 'default'}"
					onclick={() => toggleDropdown(item.name)}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d={getIcon(item, value)} />
					</svg>
				</button>

				{#if isOpen}
					<div class="layout-toolbar__dropdown">
						<span class="layout-toolbar__dropdown-header">{item.label}</span>
						<button
							type="button"
							class="layout-toolbar__option"
							class:selected={!value}
							onclick={() => selectValue(item.name, '')}
						>
							<svg class="layout-toolbar__option-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d={item.defaultIcon} />
							</svg>
							<span class="layout-toolbar__option-label layout-toolbar__option-label--default">Default</span>
							{#if !value}
								<svg class="layout-toolbar__check" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M3 8l3.5 3.5L13 5" />
								</svg>
							{/if}
						</button>
						{#each Object.keys(item.icons) as opt}
							<button
								type="button"
								class="layout-toolbar__option"
								class:selected={value === opt}
								onclick={() => selectValue(item.name, opt)}
							>
								<svg class="layout-toolbar__option-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
									<path d={item.icons[opt]} />
								</svg>
								<span class="layout-toolbar__option-label">{opt}</span>
								{#if value === opt}
									<svg class="layout-toolbar__check" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M3 8l3.5 3.5L13 5" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.layout-toolbar {
		display: flex;
		gap: 2px;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--ed-border-subtle);
		margin-bottom: 0.2rem;
	}

	.layout-toolbar__item {
		position: relative;
	}

	.layout-toolbar__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 28px;
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-0);
		color: var(--ed-text-muted);
		cursor: pointer;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast), border-color var(--ed-transition-fast);
	}

	.layout-toolbar__btn:hover {
		background: var(--ed-surface-2);
		color: var(--ed-text-secondary);
	}

	.layout-toolbar__btn.active {
		color: var(--ed-accent);
		border-color: var(--ed-accent-ring);
	}

	.layout-toolbar__btn.open {
		background: var(--ed-surface-2);
		color: var(--ed-text-primary);
		border-color: var(--ed-accent);
	}

	/* Dropdown */
	.layout-toolbar__dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 10;
		min-width: 150px;
		background: var(--ed-surface-0);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		box-shadow: var(--ed-shadow-lg);
		padding: 4px;
		display: flex;
		flex-direction: column;
		gap: 1px;
		animation: toolbar-dropdown-enter 0.1s ease-out;
	}

	.layout-toolbar__dropdown-header {
		font-size: var(--ed-text-xs);
		font-weight: 600;
		color: var(--ed-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.35rem 0.5rem 0.25rem;
		margin-bottom: 2px;
		border-bottom: 1px solid var(--ed-border-subtle);
	}

	@keyframes toolbar-dropdown-enter {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.layout-toolbar__option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.6rem;
		border: none;
		border-radius: calc(var(--ed-radius-sm) - 2px);
		background: transparent;
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		white-space: nowrap;
		transition: background var(--ed-transition-fast);
	}

	.layout-toolbar__option:hover {
		background: var(--ed-surface-2);
	}

	.layout-toolbar__option.selected {
		color: var(--ed-accent);
		font-weight: 500;
	}

	.layout-toolbar__option-icon {
		flex-shrink: 0;
		opacity: 0.7;
	}

	.layout-toolbar__option.selected .layout-toolbar__option-icon {
		opacity: 1;
	}

	.layout-toolbar__option-label {
		flex: 1;
		text-align: left;
	}

	.layout-toolbar__option-label--default {
		color: var(--ed-text-muted);
		font-style: italic;
	}

	.layout-toolbar__check {
		flex-shrink: 0;
		color: var(--ed-accent);
	}
</style>
