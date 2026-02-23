<script lang="ts">
	let {
		value,
		onchange,
		tokenName,
	}: {
		value: string;
		onchange: (v: string) => void;
		tokenName: string;
	} = $props();

	let isFullRadius = $derived(tokenName === 'radius-full');

	/** Parse the numeric px value from the string. */
	let numericValue = $derived.by(() => {
		const match = value.match(/^(\d+(?:\.\d+)?)/);
		return match ? parseFloat(match[1]) : 0;
	});

	function onSliderInput(e: Event) {
		const v = (e.target as HTMLInputElement).value;
		onchange(`${v}px`);
	}

	function onTextInput(e: Event) {
		onchange((e.target as HTMLInputElement).value);
	}
</script>

<div class="radius-editor">
	{#if isFullRadius}
		<div class="full-radius-row">
			<span class="full-label">9999px (pill)</span>
		</div>
	{:else}
		<div class="slider-row">
			<input
				type="range"
				min="0"
				max="48"
				step="1"
				value={numericValue}
				oninput={onSliderInput}
				class="slider"
			/>
			<input
				type="text"
				{value}
				oninput={onTextInput}
				class="text-input"
			/>
		</div>
	{/if}
	<div class="preview-row">
		<div class="preview-box" style:border-radius={value}></div>
	</div>
</div>

<style>
	.radius-editor {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.slider-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.slider {
		flex: 1;
		height: 4px;
		-webkit-appearance: none;
		appearance: none;
		background: #e5e5e5;
		border-radius: 2px;
		outline: none;
	}
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #0ea5e9;
		cursor: pointer;
	}
	.text-input {
		width: 56px;
		flex-shrink: 0;
		padding: 4px 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		background: white;
		text-align: right;
	}
	.text-input:focus {
		outline: none;
		border-color: #0ea5e9;
	}
	.full-radius-row {
		display: flex;
		align-items: center;
	}
	.full-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		color: #999;
	}
	.preview-row {
		display: flex;
	}
	.preview-box {
		width: 100%;
		height: 32px;
		background: #0ea5e9;
		transition: border-radius 0.15s;
	}
</style>
