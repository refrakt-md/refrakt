<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isGroup = tag.attributes.typeof === 'Cast';
	const layout = isGroup
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'layout')?.attributes?.content || 'grid'
		: 'grid';

	// For CastMember
	const memberName = !isGroup
		? tag.children.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'name')?.children?.[0] || ''
		: '';
	const memberRole = !isGroup
		? tag.children.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'role')?.children?.[0] || ''
		: '';
</script>

{#if isGroup}
	<section class="cast cast-{layout}" typeof="Cast">
		{@render children()}
	</section>
{:else}
	<div class="cast-member" typeof="CastMember">
		<div class="cast-member-info">
			{#if memberName}
				<span class="cast-member-name">{memberName}</span>
			{/if}
			{#if memberRole}
				<span class="cast-member-role">{memberRole}</span>
			{/if}
		</div>
		<div class="cast-member-body">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.cast {
		margin: 1.5rem 0;
	}

	.cast-grid :global(ul) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
		list-style: none;
		padding: 0;
	}

	.cast-list :global(ul) {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		list-style: none;
		padding: 0;
	}

	.cast-member {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		text-align: center;
	}

	.cast-member-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cast-member-name {
		font-weight: 600;
		font-size: 1rem;
		color: var(--color-text);
	}

	.cast-member-role {
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	.cast-member-body {
		margin-top: 0.75rem;
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	.cast-member-body:empty {
		display: none;
	}

	.cast-member-body :global(span[property]) {
		display: none;
	}

	.cast-member :global(img) {
		width: 80px;
		height: 80px;
		border-radius: var(--radius-full);
		object-fit: cover;
		margin: 0 auto 0.75rem;
		display: block;
	}
</style>
