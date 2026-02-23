<script lang="ts">
	let { value, onchange }: { value: string; onchange: (v: string) => void } = $props();

	let pickerRef: HTMLInputElement;

	/** Convert value to a hex string for the native picker (best-effort). */
	let hexValue = $derived.by(() => {
		const v = value.trim();
		if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
		if (/^#[0-9a-fA-F]{3}$/.test(v)) {
			const [, r, g, b] = v.match(/^#(.)(.)(.)$/)!;
			return `#${r}${r}${g}${g}${b}${b}`;
		}
		return '#000000';
	});

	function onTextInput(e: Event) {
		onchange((e.target as HTMLInputElement).value);
	}

	function onPickerInput(e: Event) {
		onchange((e.target as HTMLInputElement).value);
	}

	function openPicker() {
		pickerRef?.click();
	}
</script>

<div class="color-editor">
	<button class="swatch-btn" onclick={openPicker} title="Open color picker">
		<div class="checkerboard"></div>
		<div class="swatch-fill" style:background={value}></div>
		<input
			bind:this={pickerRef}
			type="color"
			value={hexValue}
			oninput={onPickerInput}
			class="hidden-picker"
			tabindex={-1}
		/>
	</button>
	<input
		type="text"
		{value}
		oninput={onTextInput}
		class="text-input"
	/>
</div>

<style>
	.color-editor {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.swatch-btn {
		position: relative;
		width: 32px;
		height: 28px;
		flex-shrink: 0;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
		padding: 0;
		overflow: hidden;
		background: none;
	}
	.swatch-btn:hover {
		border-color: #bbb;
	}
	.checkerboard {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(45deg, #ccc 25%, transparent 25%),
			linear-gradient(-45deg, #ccc 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #ccc 75%),
			linear-gradient(-45deg, transparent 75%, #ccc 75%);
		background-size: 8px 8px;
		background-position: 0 0, 0 4px, 4px -4px, -4px 0;
	}
	.swatch-fill {
		position: absolute;
		inset: 0;
	}
	.hidden-picker {
		position: absolute;
		width: 0;
		height: 0;
		opacity: 0;
		pointer-events: none;
	}
	.text-input {
		flex: 1;
		padding: 4px 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		background: white;
		min-width: 0;
	}
	.text-input:focus {
		outline: none;
		border-color: #0ea5e9;
	}
</style>
