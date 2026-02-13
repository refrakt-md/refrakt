<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isGroup = tag.attributes.typeof === 'Reveal';

	// For RevealStep
	const stepName = !isGroup
		? tag.children.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'name')?.children?.[0] || ''
		: '';

	// For Reveal container: count steps and manage visibility
	const mode = isGroup
		? tag.children.find((c: any) => c?.name === 'meta')?.attributes?.content || 'click'
		: 'click';

	// Find the steps container
	const stepsDiv = isGroup
		? tag.children.find((c: any) => c?.name === 'div' && c?.attributes?.['data-name'] === 'steps')
		: null;

	const totalSteps = isGroup && stepsDiv
		? (stepsDiv as any).children?.filter((c: any) => c?.attributes?.typeof === 'RevealStep')?.length ?? 0
		: 0;

	let visibleCount = $state(1);
</script>

{#if isGroup}
	<section class="reveal">
		{#if stepsDiv}
			<div class="reveal-steps">
				{#each (stepsDiv as any).children?.filter((c: any) => c?.attributes?.typeof === 'RevealStep') ?? [] as step, i}
					<div class="reveal-step" class:visible={i < visibleCount} class:hidden={i >= visibleCount}>
						<Renderer node={step} />
					</div>
				{/each}
			</div>
		{:else}
			{@render children()}
		{/if}
		{#if mode === 'click' && visibleCount < totalSteps}
			<button class="reveal-next" onclick={() => visibleCount++}>
				Continue
			</button>
		{/if}
		{#if mode === 'click' && visibleCount >= totalSteps && totalSteps > 1}
			<button class="reveal-reset" onclick={() => visibleCount = 1}>
				Start over
			</button>
		{/if}
	</section>
{:else}
	<div class="reveal-step-content">
		{#if stepName}
			<h3 class="reveal-step-title">{stepName}</h3>
		{/if}
		<div class="reveal-step-body">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.reveal {
		margin: 1.5rem 0;
	}

	.reveal-steps {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.reveal-step {
		transition: opacity 0.3s ease, transform 0.3s ease;
	}

	.reveal-step.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.reveal-step.hidden {
		opacity: 0;
		height: 0;
		overflow: hidden;
		margin: 0;
		transform: translateY(0.5rem);
	}

	.reveal-step-content {
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-border);
	}

	.reveal-step-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.5rem;
	}

	.reveal-step-body :global(span[property]),
	.reveal-step-body :global(meta) {
		display: none;
	}

	.reveal-step-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.reveal-next,
	.reveal-reset {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.5rem 1.25rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.375rem);
		background: var(--color-surface, #f9fafb);
		color: var(--color-text);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}

	.reveal-next:hover,
	.reveal-reset:hover {
		background: var(--color-border);
	}
</style>
