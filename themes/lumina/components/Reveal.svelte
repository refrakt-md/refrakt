<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isGroup = tag.attributes.typeof === 'Reveal';

	const stepName = !isGroup
		? tag.children.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'name')?.children?.[0] || ''
		: '';

	const mode = isGroup
		? tag.children.find((c: any) => c?.name === 'meta')?.attributes?.content || 'click'
		: 'click';

	const stepsDiv = isGroup
		? tag.children.find((c: any) => c?.name === 'div' && c?.attributes?.['data-name'] === 'steps')
		: null;

	const totalSteps = isGroup && stepsDiv
		? (stepsDiv as any).children?.filter((c: any) => c?.attributes?.typeof === 'RevealStep')?.length ?? 0
		: 0;

	let visibleCount = $state(1);
</script>

{#if isGroup}
	<section class="rf-reveal">
		{#if stepsDiv}
			<div class="rf-reveal__steps">
				{#each (stepsDiv as any).children?.filter((c: any) => c?.attributes?.typeof === 'RevealStep') ?? [] as step, i}
					<div class="rf-reveal-step {i < visibleCount ? 'rf-reveal-step--visible' : 'rf-reveal-step--hidden'}">
						<Renderer node={step} />
					</div>
				{/each}
			</div>
		{:else}
			{@render children()}
		{/if}
		{#if mode === 'click' && visibleCount < totalSteps}
			<button class="rf-reveal__next" onclick={() => visibleCount++}>
				Continue
			</button>
		{/if}
		{#if mode === 'click' && visibleCount >= totalSteps && totalSteps > 1}
			<button class="rf-reveal__reset" onclick={() => visibleCount = 1}>
				Start over
			</button>
		{/if}
	</section>
{:else}
	<div class="rf-reveal-step__content">
		{#if stepName}
			<h3 class="rf-reveal-step__title">{stepName}</h3>
		{/if}
		<div class="rf-reveal-step__body">
			{@render children()}
		</div>
	</div>
{/if}
