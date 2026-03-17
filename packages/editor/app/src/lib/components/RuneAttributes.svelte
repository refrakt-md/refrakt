<script lang="ts">
	import type { RuneInfo, RuneAttributeInfo } from '../api/client.js';

	interface Props {
		runeInfo: RuneInfo;
		attributes: Record<string, string>;
		onchange: (attrs: Record<string, string>) => void;
	}

	let { runeInfo, attributes, onchange }: Props = $props();

	/** Attributes that only apply when layout is split or split-reverse */
	const SPLIT_ONLY_ATTRS = new Set(['ratio', 'align', 'gap', 'collapse']);

	function updateAttr(name: string, value: string) {
		const next = { ...attributes };
		if (value === '' || value === undefined) {
			delete next[name];
		} else {
			next[name] = value;
		}
		onchange(next);
	}

	/** Format kebab-case attribute name for display */
	function formatLabel(name: string): string {
		return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
	}

	/** Check if split-only attrs should be hidden */
	function isSplitOnly(name: string): boolean {
		if (!SPLIT_ONLY_ATTRS.has(name)) return false;
		if (!('layout' in runeInfo.attributes)) return false;
		const layout = attributes['layout'] ?? '';
		return layout !== 'split' && layout !== 'split-reverse';
	}

	/** All schema attributes, sorted with required first */
	let sortedAttrs = $derived(
		Object.entries(runeInfo.attributes)
			.filter(([name]) => !isSplitOnly(name))
			.sort(([, a], [, b]) => (a.required === b.required ? 0 : a.required ? -1 : 1))
	);

	// ── Dropdown state ──────────────────────────────────────────
	let openDropdown: string | null = $state(null);
	let attrsEl: HTMLDivElement;

	function toggleDropdown(name: string) {
		openDropdown = openDropdown === name ? null : name;
	}

	function selectValue(name: string, value: string) {
		updateAttr(name, value);
		openDropdown = null;
	}

	function handleClickOutside(e: MouseEvent) {
		if (openDropdown && attrsEl && !attrsEl.contains(e.target as Node)) {
			openDropdown = null;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && openDropdown) {
			openDropdown = null;
			e.stopPropagation();
		}
	}

	// ── Inline text editing state ────────────────────────────────
	let editingAttr: string | null = $state(null);
	let editValue: string = $state('');

	function startEditing(name: string, currentValue: string) {
		editingAttr = name;
		editValue = currentValue;
	}

	function commitEdit(name: string) {
		updateAttr(name, editValue);
		editingAttr = null;
	}

	function handleEditKeydown(e: KeyboardEvent, name: string) {
		if (e.key === 'Enter') {
			commitEdit(name);
		} else if (e.key === 'Escape') {
			editingAttr = null;
			e.stopPropagation();
		}
	}
</script>

<svelte:window onmousedown={handleClickOutside} onkeydown={handleKeydown} />

<div class="rune-attrs" bind:this={attrsEl}>
	{#each sortedAttrs as [name, info] (name)}
		{@const value = attributes[name] ?? ''}
		<div class="rune-attrs__row">
			<span class="rune-attrs__label">
				{formatLabel(name)}
				{#if info.required}
					<span class="rune-attrs__required">*</span>
				{/if}
				{#if info.description}
					<span class="rune-attrs__info" data-tooltip={info.description}>
						<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="8" cy="8" r="7" />
							<line x1="8" y1="7" x2="8" y2="11" />
							<circle cx="8" cy="4.5" r="0.5" fill="currentColor" stroke="none" />
						</svg>
					</span>
				{/if}
			</span>

			{#if info.type === 'Boolean'}
				<button
					type="button"
					class="rune-attrs__value"
					class:active={value === 'true'}
					onclick={() => updateAttr(name, value === 'true' ? '' : 'true')}
				>
					{value === 'true' ? 'Yes' : 'No'}
				</button>

			{:else if info.values && info.values.length > 0}
				<div class="rune-attrs__enum">
					<button
						type="button"
						class="rune-attrs__value"
						class:active={!!value}
						class:open={openDropdown === name}
						onclick={() => toggleDropdown(name)}
					>
						{value || 'default'}
					</button>

					{#if openDropdown === name}
						<div class="rune-attrs__dropdown">
							<button
								type="button"
								class="rune-attrs__option"
								class:selected={!value}
								onclick={() => selectValue(name, '')}
							>
								<span class="rune-attrs__option-label rune-attrs__option-label--default">default</span>
								{#if !value}
									<svg class="rune-attrs__check" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M3 8l3.5 3.5L13 5" />
									</svg>
								{/if}
							</button>
							{#each info.values as opt}
								<button
									type="button"
									class="rune-attrs__option"
									class:selected={value === opt}
									onclick={() => selectValue(name, opt)}
								>
									<span class="rune-attrs__option-label">{opt}</span>
									{#if value === opt}
										<svg class="rune-attrs__check" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M3 8l3.5 3.5L13 5" />
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>

			{:else if editingAttr === name}
				<input
					class="rune-attrs__inline-input"
					type={info.type === 'Number' ? 'number' : 'text'}
					bind:value={editValue}
					onblur={() => commitEdit(name)}
					onkeydown={(e) => handleEditKeydown(e, name)}
					autofocus
				/>

			{:else}
				<button
					type="button"
					class="rune-attrs__value"
					class:active={!!value}
					onclick={() => startEditing(name, value)}
				>
					{value || (info.required ? 'required' : 'default')}
				</button>
			{/if}
		</div>
	{/each}

	{#if sortedAttrs.length === 0}
		<span class="rune-attrs__empty">No attributes</span>
	{/if}
</div>

<style>
	.rune-attrs {
		display: flex;
		flex-direction: column;
	}

	.rune-attrs__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--ed-border-subtle);
		position: relative;
	}

	.rune-attrs__row:last-child {
		border-bottom: none;
	}

	.rune-attrs__label {
		font-size: var(--ed-text-base);
		color: var(--ed-text-tertiary);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.rune-attrs__required {
		color: var(--ed-danger);
	}

	.rune-attrs__info {
		display: inline-flex;
		align-items: center;
		color: var(--ed-text-muted);
		cursor: help;
		position: relative;
		margin-left: 0.2rem;
		vertical-align: middle;
		transition: color var(--ed-transition-fast);
	}

	.rune-attrs__info:hover {
		color: var(--ed-accent);
	}

	.rune-attrs__info::after {
		content: attr(data-tooltip);
		position: absolute;
		left: 0;
		top: calc(100% + 6px);
		background: var(--ed-surface-invert, #1a1a1a);
		color: var(--ed-text-invert, #f0f0f0);
		font-size: var(--ed-text-sm);
		font-style: normal;
		font-weight: 400;
		padding: 0.35rem 0.5rem;
		border-radius: var(--ed-radius-sm);
		box-shadow: var(--ed-shadow-lg);
		white-space: normal;
		width: max-content;
		max-width: 220px;
		line-height: 1.4;
		pointer-events: none;
		opacity: 0;
		transition: opacity var(--ed-transition-fast);
		z-index: 20;
	}

	.rune-attrs__info:hover::after {
		opacity: 1;
	}

	/* Clickable value button */
	.rune-attrs__value {
		font-size: var(--ed-text-base);
		color: var(--ed-text-muted);
		font-style: italic;
		background: none;
		border: none;
		padding: 0.15rem 0.4rem;
		border-radius: var(--ed-radius-sm);
		cursor: pointer;
		text-align: right;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rune-attrs__value:hover {
		background: var(--ed-surface-2);
		color: var(--ed-text-secondary);
	}

	.rune-attrs__value.active {
		color: var(--ed-text-primary);
		font-style: normal;
		font-weight: 500;
	}

	.rune-attrs__value.open {
		background: var(--ed-surface-2);
		color: var(--ed-text-primary);
	}

	/* Enum dropdown container */
	.rune-attrs__enum {
		position: relative;
		display: flex;
		justify-content: flex-end;
		min-width: 0;
	}

	.rune-attrs__dropdown {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		z-index: 10;
		min-width: 130px;
		background: var(--ed-surface-0);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		box-shadow: var(--ed-shadow-lg);
		padding: 4px;
		display: flex;
		flex-direction: column;
		gap: 1px;
		animation: dropdown-enter 0.1s ease-out;
	}

	@keyframes dropdown-enter {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.rune-attrs__option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0.5rem;
		border: none;
		border-radius: calc(var(--ed-radius-sm) - 2px);
		background: transparent;
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-base);
		cursor: pointer;
		white-space: nowrap;
		transition: background var(--ed-transition-fast);
	}

	.rune-attrs__option:hover {
		background: var(--ed-surface-2);
	}

	.rune-attrs__option.selected {
		color: var(--ed-accent);
		font-weight: 500;
	}

	.rune-attrs__option-label {
		flex: 1;
		text-align: left;
	}

	.rune-attrs__option-label--default {
		color: var(--ed-text-muted);
		font-style: italic;
	}

	.rune-attrs__check {
		flex-shrink: 0;
		color: var(--ed-accent);
	}

	/* Inline text input */
	.rune-attrs__inline-input {
		font-size: var(--ed-text-base);
		padding: 0.1rem 0.35rem;
		border: 1px solid var(--ed-accent);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-0);
		color: var(--ed-text-primary);
		outline: none;
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
		text-align: right;
		width: 8rem;
		font-family: inherit;
	}

	.rune-attrs__empty {
		font-size: var(--ed-text-base);
		color: var(--ed-text-muted);
		font-style: italic;
	}
</style>
