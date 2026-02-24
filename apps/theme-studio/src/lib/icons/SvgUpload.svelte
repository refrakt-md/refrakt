<script lang="ts">
	import { validateSvg } from './svg-utils.js';

	let { onupload, oncancel }: {
		onupload: (svg: string) => void;
		oncancel: () => void;
	} = $props();

	let error = $state('');
	let previewSvg = $state('');

	async function handleFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const text = await file.text();
		processUpload(text);
	}

	function handlePaste(e: ClipboardEvent) {
		const text = e.clipboardData?.getData('text');
		if (text && text.includes('<svg')) {
			e.preventDefault();
			processUpload(text);
		}
	}

	function processUpload(raw: string) {
		const result = validateSvg(raw);
		if (!result.valid) {
			error = result.errors.join('. ');
			previewSvg = '';
			return;
		}
		previewSvg = raw;
		error = '';
	}

	function confirm() {
		if (previewSvg) onupload(previewSvg);
	}
</script>

<div class="svg-upload">
	<div class="upload-area" onpaste={handlePaste}>
		<label class="file-label">
			<input type="file" accept=".svg" onchange={handleFile} />
			Choose SVG file
		</label>
		<span class="or">or paste SVG markup</span>
		<textarea
			class="paste-area"
			placeholder="Paste <svg>...</svg> here"
			oninput={(e) => processUpload((e.target as HTMLTextAreaElement).value)}
		></textarea>
	</div>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	{#if previewSvg}
		<div class="preview">
			<span class="preview-label">Preview</span>
			<div class="preview-icon">{@html previewSvg}</div>
		</div>
	{/if}

	<div class="actions">
		{#if previewSvg}
			<button class="confirm-btn" onclick={confirm}>Use this icon</button>
		{/if}
		<button class="cancel-btn" onclick={oncancel}>Cancel</button>
	</div>
</div>

<style>
	.svg-upload {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.upload-area {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.file-label {
		display: inline-flex;
		align-items: center;
		padding: 6px 12px;
		border: 1px dashed #ccc;
		border-radius: 6px;
		cursor: pointer;
		font-size: 12px;
		color: #555;
		background: #fafafa;
		align-self: flex-start;
	}

	.file-label:hover {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}

	.file-label input {
		display: none;
	}

	.or {
		font-size: 11px;
		color: #999;
	}

	.paste-area {
		padding: 8px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		font-size: 11px;
		font-family: 'SF Mono', 'Fira Code', monospace;
		resize: vertical;
		min-height: 60px;
		color: #555;
		background: white;
	}

	.paste-area:focus {
		outline: none;
		border-color: #0ea5e9;
	}

	.error {
		font-size: 11px;
		color: #ef4444;
		padding: 4px 0;
	}

	.preview {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.preview-label {
		font-size: 11px;
		font-weight: 600;
		color: #999;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.preview-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		color: #333;
	}

	.preview-icon :global(svg) {
		width: 24px;
		height: 24px;
	}

	.actions {
		display: flex;
		gap: 6px;
	}

	.confirm-btn {
		padding: 4px 10px;
		border: 1px solid #0ea5e9;
		border-radius: 6px;
		background: #0ea5e9;
		color: white;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.confirm-btn:hover {
		background: #0284c7;
		border-color: #0284c7;
	}

	.cancel-btn {
		padding: 4px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 12px;
		color: #999;
	}

	.cancel-btn:hover {
		border-color: #ccc;
		color: #555;
	}
</style>
