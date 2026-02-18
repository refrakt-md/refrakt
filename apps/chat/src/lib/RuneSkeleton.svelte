<script lang="ts">
	import type { InProgressBlock } from './block-scanner.js';

	let { blocks }: { blocks: InProgressBlock[] } = $props();
</script>

{#each blocks as block (block.startIndex)}
	<div class="rune-skeleton">
		<div class="rune-skeleton__pulse"></div>
		<span class="rune-skeleton__label">Building {block.label}...</span>
	</div>
{/each}

<style>
	.rune-skeleton {
		position: relative;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.5rem;
		padding: 1.5rem 1rem;
		margin: 0.75rem 0;
		overflow: hidden;
		min-height: 4rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.rune-skeleton__pulse {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent 0%,
			var(--rf-color-primary-100, #e0f2fe) 50%,
			transparent 100%
		);
		animation: skeleton-pulse 1.5s ease-in-out infinite;
		opacity: 0.4;
	}

	.rune-skeleton__label {
		position: relative;
		z-index: 1;
		font-size: 0.875rem;
		color: var(--rf-color-text-muted, #64748b);
		font-style: italic;
	}

	@keyframes skeleton-pulse {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}
</style>
