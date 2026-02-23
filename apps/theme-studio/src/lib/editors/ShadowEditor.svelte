<script lang="ts">
	let { value, onchange }: { value: string; onchange: (v: string) => void } = $props();

	function onTextInput(e: Event) {
		onchange((e.target as HTMLInputElement).value);
	}
</script>

<div class="shadow-editor">
	<div class="preview-area">
		<div class="preview-box" style:box-shadow={value}></div>
	</div>
	<input
		type="text"
		{value}
		oninput={onTextInput}
		class="text-input"
	/>
</div>

<style>
	.shadow-editor {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.preview-area {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px 8px;
		background: #f5f5f5;
		border-radius: 4px;
	}
	.preview-box {
		width: 64px;
		height: 40px;
		background: white;
		border-radius: 6px;
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
</style>
