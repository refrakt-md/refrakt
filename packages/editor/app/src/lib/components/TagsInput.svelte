<script lang="ts">
	interface Props {
		tags: string[];
		onchange: (tags: string[]) => void;
	}

	let { tags, onchange }: Props = $props();
	let inputValue = $state('');

	function addTag(value: string) {
		const trimmed = value.trim();
		if (trimmed && !tags.includes(trimmed)) {
			onchange([...tags, trimmed]);
		}
		inputValue = '';
	}

	function removeTag(index: number) {
		onchange(tags.filter((_, i) => i !== index));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag(inputValue);
		} else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
			removeTag(tags.length - 1);
		}
	}
</script>

<div class="tags-input">
	{#each tags as tag, i}
		<span class="tags-input__tag">
			{tag}
			<button
				class="tags-input__remove"
				onclick={() => removeTag(i)}
				aria-label="Remove {tag}"
			>&times;</button>
		</span>
	{/each}
	<input
		class="tags-input__field"
		type="text"
		bind:value={inputValue}
		onkeydown={handleKeydown}
		onblur={() => { if (inputValue.trim()) addTag(inputValue); }}
		placeholder={tags.length === 0 ? 'Add tags...' : ''}
	/>
</div>

<style>
	.tags-input {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0.3rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		background: #ffffff;
		min-height: 2rem;
		align-items: center;
	}

	.tags-input:focus-within {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
	}

	.tags-input__tag {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.1rem 0.4rem;
		background: #e0f2fe;
		color: #0369a1;
		border-radius: 3px;
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.tags-input__remove {
		background: none;
		border: none;
		color: #0369a1;
		cursor: pointer;
		font-size: 0.85rem;
		padding: 0;
		line-height: 1;
		opacity: 0.6;
	}

	.tags-input__remove:hover {
		opacity: 1;
	}

	.tags-input__field {
		flex: 1;
		min-width: 60px;
		border: none;
		outline: none;
		font-size: 0.8rem;
		padding: 0.15rem 0.25rem;
		background: transparent;
		color: #1a1a2e;
	}
</style>
