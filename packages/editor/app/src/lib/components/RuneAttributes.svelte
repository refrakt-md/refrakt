<script lang="ts">
	import type { RuneInfo, RuneAttributeInfo } from '../api/client.js';

	interface Props {
		runeInfo: RuneInfo;
		attributes: Record<string, string>;
		onchange: (attrs: Record<string, string>) => void;
	}

	let { runeInfo, attributes, onchange }: Props = $props();

	function updateAttr(name: string, value: string) {
		const next = { ...attributes };
		if (value === '' || value === undefined) {
			delete next[name];
		} else {
			next[name] = value;
		}
		onchange(next);
	}

	/** All schema attributes, sorted with required first */
	let sortedAttrs = $derived(
		Object.entries(runeInfo.attributes)
			.sort(([, a], [, b]) => (a.required === b.required ? 0 : a.required ? -1 : 1))
	);
</script>

<div class="rune-attrs">
	{#each sortedAttrs as [name, info] (name)}
		{@const value = attributes[name] ?? ''}
		<label class="rune-attr">
			<span class="rune-attr__label">
				{name}
				{#if info.required}
					<span class="rune-attr__required">*</span>
				{/if}
			</span>

			{#if info.type === 'Boolean'}
				<div class="rune-attr__toggle-row">
					<button
						class="rune-attr__toggle"
						class:active={value === 'true'}
						onclick={() => updateAttr(name, value === 'true' ? '' : 'true')}
						type="button"
					>
						<span class="rune-attr__toggle-knob"></span>
					</button>
					<span class="rune-attr__toggle-label">{value === 'true' ? 'Yes' : 'No'}</span>
				</div>
			{:else if info.values && info.values.length > 0}
				<select
					class="rune-attr__select"
					value={value}
					onchange={(e) => updateAttr(name, (e.target as HTMLSelectElement).value)}
				>
					{#if !info.required}
						<option value="">-- none --</option>
					{/if}
					{#each info.values as opt}
						<option value={opt}>{opt}</option>
					{/each}
				</select>
			{:else if info.type === 'Number'}
				<input
					class="rune-attr__input"
					type="number"
					value={value}
					oninput={(e) => updateAttr(name, (e.target as HTMLInputElement).value)}
					placeholder={info.required ? 'required' : ''}
				/>
			{:else}
				<input
					class="rune-attr__input"
					type="text"
					value={value}
					oninput={(e) => updateAttr(name, (e.target as HTMLInputElement).value)}
					placeholder={info.required ? 'required' : ''}
				/>
			{/if}
		</label>
	{/each}

	{#if sortedAttrs.length === 0}
		<span class="rune-attrs__empty">No attributes</span>
	{/if}
</div>

<style>
	.rune-attrs {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.rune-attr {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.rune-attr__label {
		font-size: 0.65rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.rune-attr__required {
		color: #ef4444;
	}

	.rune-attr__input {
		padding: 0.4rem 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		font-size: 0.8rem;
		color: #1a1a2e;
		background: #ffffff;
		outline: none;
		font-family: inherit;
	}

	.rune-attr__input:focus {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
	}

	.rune-attr__select {
		padding: 0.4rem 0.6rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		font-size: 0.8rem;
		color: #1a1a2e;
		background: #ffffff;
		outline: none;
		font-family: inherit;
		cursor: pointer;
	}

	.rune-attr__select:focus {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
	}

	/* Toggle switch */
	.rune-attr__toggle-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.rune-attr__toggle {
		position: relative;
		width: 32px;
		height: 18px;
		border-radius: 9px;
		border: 1px solid #cbd5e1;
		background: #e2e8f0;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
		padding: 0;
	}

	.rune-attr__toggle.active {
		background: #0ea5e9;
		border-color: #0ea5e9;
	}

	.rune-attr__toggle-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #ffffff;
		transition: transform 0.15s;
	}

	.rune-attr__toggle.active .rune-attr__toggle-knob {
		transform: translateX(14px);
	}

	.rune-attr__toggle-label {
		font-size: 0.75rem;
		color: #64748b;
	}

	.rune-attrs__empty {
		font-size: 0.75rem;
		color: #94a3b8;
		font-style: italic;
	}
</style>
