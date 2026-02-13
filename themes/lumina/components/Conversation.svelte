<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isGroup = tag.attributes.typeof === 'Conversation';

	// For ConversationMessage
	const speaker = !isGroup
		? tag.children.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'speaker')?.children?.[0] || ''
		: '';
	const alignment = !isGroup
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'alignment')?.attributes?.content || 'left'
		: 'left';
</script>

{#if isGroup}
	<div class="conversation">
		{@render children()}
	</div>
{:else}
	<div class="message message-{alignment}">
		{#if speaker}
			<span class="message-speaker">{speaker}</span>
		{/if}
		<div class="message-bubble">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.conversation {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin: 1.5rem 0;
		max-width: 40rem;
	}

	.conversation :global(div[data-name="messages"]) {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.message {
		display: flex;
		flex-direction: column;
		max-width: 80%;
	}

	.message-left {
		align-self: flex-start;
		align-items: flex-start;
	}

	.message-right {
		align-self: flex-end;
		align-items: flex-end;
	}

	.message-speaker {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-muted);
		margin-bottom: 0.25rem;
		padding: 0 0.75rem;
	}

	.message-bubble {
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		font-size: 0.9375rem;
		line-height: 1.5;
	}

	.message-left .message-bubble {
		background: var(--color-surface, #f4f4f5);
		border-bottom-left-radius: 0.25rem;
	}

	.message-right .message-bubble {
		background: var(--color-primary, #2563eb);
		color: white;
		border-bottom-right-radius: 0.25rem;
	}

	.message-bubble :global(p) {
		margin: 0;
	}

	.message-bubble :global(p + p) {
		margin-top: 0.5rem;
	}

	.message-bubble :global(span[property]),
	.message-bubble :global(meta) {
		display: none;
	}

	.message :global(span[property="speaker"]),
	.message :global(meta[property]) {
		display: none;
	}
</style>
