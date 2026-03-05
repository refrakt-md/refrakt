<script lang="ts">
	import type { ParsedBlock } from '../editor/block-parser.js';
	import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
	import { renderBlockPreview } from '../preview/block-renderer.js';
	import { initRuneBehaviors } from '@refrakt-md/behaviors';

	interface Props {
		block: ParsedBlock;
		themeConfig: ThemeConfig | null;
		themeCss: string;
		highlightCss?: string;
		highlightTransform?: ((tree: RendererNode) => RendererNode) | null;
		communityTags?: Record<string, unknown> | null;
		communityPostTransforms?: Record<string, Function> | null;
		communityStyles?: Record<string, Record<string, unknown>> | null;
		aggregated?: Record<string, unknown>;
		dragHandle?: boolean;
		ondragstart: (e: DragEvent) => void;
		ondragover: (e: DragEvent) => void;
		ondrop: (e: DragEvent) => void;
	}

	let {
		block,
		themeConfig,
		themeCss,
		highlightCss: hlCssProp = '',
		highlightTransform: hlTransformProp = null,
		communityTags = null,
		communityPostTransforms = null,
		communityStyles = null,
		aggregated = {},
		dragHandle = true,
		ondragstart,
		ondragover,
		ondrop,
	}: Props = $props();

	// ── Inline preview via Shadow DOM ─────────────────────────────
	let previewContainer: HTMLDivElement | undefined = $state();
	let shadowRoot: ShadowRoot | null = null;
	let previewDebounce: ReturnType<typeof setTimeout>;
	let behaviorCleanup: (() => void) | null = null;

	$effect(() => {
		if (!previewContainer || !themeConfig) return;

		// Attach shadow root once
		if (!shadowRoot) {
			shadowRoot = previewContainer.attachShadow({ mode: 'open' });
		}

		const source = block.source;
		const config = themeConfig;
		const css = themeCss;
		const hlCss = hlCssProp || '';
		const hlTransform = hlTransformProp;

		clearTimeout(previewDebounce);
		previewDebounce = setTimeout(() => {
			if (!shadowRoot) return;

			// Clean up previous behaviors before re-rendering
			if (behaviorCleanup) {
				behaviorCleanup();
				behaviorCleanup = null;
			}

			try {
				const { html, isComponent } = renderBlockPreview(
				source,
				config,
				hlTransform,
				communityTags ?? undefined,
				communityPostTransforms ?? undefined,
				aggregated,
				communityStyles ?? undefined,
			);
				if (isComponent) {
					shadowRoot.innerHTML = `<style>
						:host { display: block; padding: 0.75rem 1.5rem; }
						.placeholder { display: flex; align-items: center; gap: 0.5rem; color: #888; font-family: system-ui, sans-serif; font-size: 13px; }
						.placeholder svg { opacity: 0.5; }
					</style>
					<div class="placeholder">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<rect x="2" y="2" width="12" height="12" rx="2" />
							<path d="M6 6l4 4M10 6l-4 4" />
						</svg>
						Interactive component — see full preview
					</div>`;
				} else {
					// Re-scope :root to :host so CSS custom properties apply within the shadow tree
					const scopedCss = css.replace(/:root/g, ':host');
					shadowRoot.innerHTML = `<style>${scopedCss}
${hlCss}
						:host { display: block; }
						.rf-preview-wrapper {
							font-family: var(--rf-font-sans, system-ui, -apple-system, sans-serif);
							color: var(--rf-color-text, #1a1a2e);
							line-height: 1.6;
							--rf-content-max: calc(100% - 6rem);
							--rf-content-gutter: 1.5rem;
						}
						.rf-preview-wrapper > article {
							display: grid;
							grid-template-columns:
								[full-start] 1fr
								[wide-start] minmax(0, var(--rf-wide-inset, 8rem))
								[content-start] min(var(--rf-content-max), 100% - var(--rf-content-gutter) * 2)
								[content-end] minmax(0, var(--rf-wide-inset, 8rem))
								[wide-end] 1fr
								[full-end];
						}
						.rf-preview-wrapper > article > * { grid-column: content; }
						.rf-preview-wrapper > article > [data-width="wide"] { grid-column: wide; }
						.rf-preview-wrapper > article > [data-width="full"],
						.rf-preview-wrapper > article > :is([data-tint], [data-color-scheme]):not([data-width]) {
							grid-column: full;
							padding-inline: max(var(--rf-content-gutter, 1.5rem), calc((100% - var(--rf-content-max)) / 2));
						}
					</style>
					<div class="rf-preview-wrapper">${html}</div>`;

					// Run behaviors (tabs, accordion, copy, etc.) on the rendered content
					const wrapper = shadowRoot.querySelector('.rf-preview-wrapper') as HTMLElement | null;
					if (wrapper) {
						behaviorCleanup = initRuneBehaviors(wrapper);
					}
				}
			} catch {
				if (shadowRoot) {
					shadowRoot.innerHTML = `<style>:host { display: block; padding: 0.75rem 1.5rem; color: #999; font-family: system-ui; font-size: 12px; }</style><em>Preview unavailable</em>`;
				}
			}
		}, 50);

		return () => {
			clearTimeout(previewDebounce);
			if (behaviorCleanup) {
				behaviorCleanup();
				behaviorCleanup = null;
			}
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="block-card"
	draggable={dragHandle ? 'true' : 'false'}
	ondragstart={ondragstart}
	ondragover={ondragover}
	ondrop={ondrop}
>
	{#if dragHandle}
		<span class="block-card__drag" title="Drag to reorder">
			<svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
				<circle cx="2" cy="2" r="1.2" />
				<circle cx="6" cy="2" r="1.2" />
				<circle cx="2" cy="7" r="1.2" />
				<circle cx="6" cy="7" r="1.2" />
				<circle cx="2" cy="12" r="1.2" />
				<circle cx="6" cy="12" r="1.2" />
			</svg>
		</span>
	{/if}

	<!-- Inline preview (Shadow DOM) — always visible -->
	{#if themeConfig}
		<div class="block-card__inline-preview" bind:this={previewContainer}></div>
	{/if}
</div>

<style>
	.block-card {
		position: relative;
	}

	/* Drag handle — inside block, top-left corner, visible on hover */
	.block-card__drag {
		position: absolute;
		left: 6px;
		top: 6px;
		cursor: grab;
		color: var(--ed-text-muted);
		padding: 0.2rem;
		user-select: none;
		display: flex;
		align-items: center;
		opacity: 0;
		transition: opacity var(--ed-transition-fast);
		z-index: 1;
		border-radius: var(--ed-radius-sm);
	}

	.block-card:hover .block-card__drag {
		opacity: 0.35;
	}

	.block-card:hover .block-card__drag:hover {
		opacity: 1;
		background: var(--ed-surface-2);
	}

	.block-card__drag:active {
		cursor: grabbing;
	}

	/* Inline preview — always visible, seamless */
	.block-card__inline-preview {
		overflow: hidden;
	}
</style>
