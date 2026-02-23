<script lang="ts">
	let {
		value,
		onchange,
		category,
	}: {
		value: string;
		onchange: (v: string) => void;
		category: 'sans' | 'mono';
	} = $props();

	const sansPresets = [
		{ label: 'System UI', value: 'system-ui, -apple-system, sans-serif' },
		{ label: 'Inter', value: "'Inter', system-ui, -apple-system, sans-serif" },
		{ label: 'Open Sans', value: "'Open Sans', system-ui, sans-serif" },
		{ label: 'Lato', value: "'Lato', system-ui, sans-serif" },
		{ label: 'Roboto', value: "'Roboto', system-ui, sans-serif" },
		{ label: 'Georgia (serif)', value: "Georgia, 'Times New Roman', serif" },
	];

	const monoPresets = [
		{ label: 'JetBrains Mono', value: "'JetBrains Mono', 'Fira Code', monospace" },
		{ label: 'Fira Code', value: "'Fira Code', 'JetBrains Mono', monospace" },
		{ label: 'Source Code Pro', value: "'Source Code Pro', monospace" },
		{ label: 'Cascadia Code', value: "'Cascadia Code', 'Consolas', monospace" },
		{ label: 'System monospace', value: 'monospace' },
	];

	let presets = $derived(category === 'mono' ? monoPresets : sansPresets);

	/** Check if value matches a preset */
	let matchedPreset = $derived(
		presets.find((p) => p.value === value)?.value ?? '__custom__',
	);

	let isCustom = $derived(matchedPreset === '__custom__');

	function onSelectChange(e: Event) {
		const selected = (e.target as HTMLSelectElement).value;
		if (selected === '__custom__') return;
		onchange(selected);
	}

	function onTextInput(e: Event) {
		onchange((e.target as HTMLInputElement).value);
	}

	let previewText = $derived(category === 'mono' ? 'const x = 42;' : 'The quick brown fox');
</script>

<div class="font-editor">
	<select class="font-select" value={matchedPreset} onchange={onSelectChange}>
		{#each presets as preset}
			<option value={preset.value}>{preset.label}</option>
		{/each}
		<option value="__custom__">Custom</option>
	</select>
	{#if isCustom}
		<input
			type="text"
			{value}
			oninput={onTextInput}
			class="text-input"
			placeholder="Font stack..."
		/>
	{/if}
	<div class="font-preview" style:font-family={value}>
		{previewText}
	</div>
</div>

<style>
	.font-editor {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.font-select {
		width: 100%;
		padding: 4px 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 12px;
		background: white;
		cursor: pointer;
	}
	.font-select:focus {
		outline: none;
		border-color: #0ea5e9;
	}
	.text-input {
		width: 100%;
		padding: 4px 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		background: white;
	}
	.text-input:focus {
		outline: none;
		border-color: #0ea5e9;
	}
	.font-preview {
		padding: 6px 8px;
		background: #f5f5f5;
		border-radius: 4px;
		font-size: 14px;
		color: #333;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
