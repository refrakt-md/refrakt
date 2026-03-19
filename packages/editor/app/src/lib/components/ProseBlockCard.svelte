<script lang="ts">
	import type { ProseBlock, ParsedBlock } from '../editor/block-parser.js';
	import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
	import { renderBlockPreview } from '../preview/block-renderer.js';
	import { initRuneBehaviors } from '@refrakt-md/behaviors';
	import { stripInlineMarkdown } from '../editor/inline-markdown.js';

	export interface ProseElementClickInfo {
		/** Type of the clicked element: heading, paragraph, fence, list, quote, hr, image */
		elementType: string;
		/** Plain text content of the element */
		text: string;
		/** Bounding rect for popover positioning */
		rect: DOMRect;
		/** Index of the child block within the prose block's children array */
		childIndex: number;
		/** For headings: the level (1-6) */
		headingLevel?: number;
		/** For fences: the language string */
		fenceLanguage?: string;
		/** For fences: the code content */
		fenceCode?: string;
	}

	interface Props {
		block: ProseBlock;
		themeConfig: ThemeConfig | null;
		themeCss: string;
		highlightCss?: string;
		highlightTransform?: ((tree: RendererNode) => RendererNode) | null;
		communityTags?: Record<string, unknown> | null;
		communityPostTransforms?: Record<string, Function> | null;
		communityStyles?: Record<string, Record<string, unknown>> | null;
		aggregated?: Record<string, unknown>;
		dragHandle?: boolean;
		readOnly?: boolean;
		onsectionclick?: (info: ProseElementClickInfo) => void;
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
		readOnly = false,
		onsectionclick,
		ondragstart,
		ondragover,
		ondrop,
	}: Props = $props();

	// ── Shadow DOM preview ─────────────────────────────────────
	let previewContainer: HTMLDivElement | undefined = $state();
	let shadowRoot: ShadowRoot | null = null;
	let previewDebounce: ReturnType<typeof setTimeout>;
	let behaviorCleanup: (() => void) | null = null;

	/** Block-level element tag names we consider hoverable prose targets */
	const PROSE_BLOCK_TAGS = new Set([
		'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
		'P', 'PRE', 'UL', 'OL', 'BLOCKQUOTE', 'HR', 'TABLE',
	]);

	/** Human-readable label for a DOM element tag */
	function tagLabel(tag: string): string {
		if (tag.startsWith('H') && tag.length === 2) return `h${tag[1]}`;
		const labels: Record<string, string> = {
			P: 'paragraph',
			PRE: 'code',
			UL: 'list',
			OL: 'list',
			BLOCKQUOTE: 'quote',
			HR: 'divider',
			TABLE: 'table',
		};
		return labels[tag] ?? tag.toLowerCase();
	}

	/** Find the nearest block-level prose target from the event target */
	function findProseTarget(start: HTMLElement, root: HTMLElement): HTMLElement | null {
		let el: HTMLElement | null = start;
		while (el && el !== root) {
			if (PROSE_BLOCK_TAGS.has(el.tagName)) return el;
			el = el.parentElement;
		}
		return null;
	}

	/** Map a DOM element back to its child index in the prose block.
	 *  Uses text-matching: compare the element's text content against each child's stripped text. */
	function findChildIndex(el: HTMLElement): number {
		const elText = (el.textContent ?? '').trim();
		const tag = el.tagName;

		for (let i = 0; i < block.children.length; i++) {
			const child = block.children[i];

			// Match by type + text content
			if (tag.startsWith('H') && tag.length === 2 && child.type === 'heading') {
				const childText = stripInlineMarkdown((child as any).text ?? '').trim();
				if (elText === childText) return i;
			} else if (tag === 'P' && child.type === 'paragraph') {
				const childText = stripInlineMarkdown(child.source).trim();
				if (elText === childText) return i;
			} else if (tag === 'PRE' && child.type === 'fence') {
				// Code fences render as <pre><code>...</code></pre>
				const codeEl = el.querySelector('code');
				const codeText = (codeEl ?? el).textContent?.trim() ?? '';
				const childCode = ((child as any).code ?? '').trim();
				if (codeText === childCode) return i;
			} else if ((tag === 'UL' || tag === 'OL') && child.type === 'list') {
				const childText = child.source.replace(/^[-*+\d.]+\s*/gm, '').trim();
				if (elText.includes(childText.slice(0, 30)) || childText.includes(elText.slice(0, 30))) return i;
			} else if (tag === 'BLOCKQUOTE' && child.type === 'quote') {
				const childText = child.source.replace(/^>\s*/gm, '').trim();
				if (elText === childText) return i;
			} else if (tag === 'HR' && child.type === 'hr') {
				return i;
			}
		}

		return -1;
	}

	/** Attach hover + click handlers to the shadow DOM wrapper */
	function attachProseHandlers(wrapper: HTMLElement) {
		let hoveredEl: HTMLElement | null = null;
		let removeTimer: ReturnType<typeof setTimeout> | null = null;
		const HOVER_DEBOUNCE = 75;

		// Tooltip element
		const tooltip = document.createElement('div');
		tooltip.className = 'rf-edit-tooltip';
		wrapper.appendChild(tooltip);

		function showTooltip(label: string, me: MouseEvent) {
			tooltip.textContent = label;
			tooltip.style.left = `${me.clientX + 12}px`;
			tooltip.style.top = `${me.clientY + 12}px`;
			tooltip.classList.add('rf-tooltip-visible');
		}

		function hideTooltip() {
			tooltip.classList.remove('rf-tooltip-visible');
		}

		wrapper.addEventListener('mouseover', (e) => {
			const target = findProseTarget(e.target as HTMLElement, wrapper);

			if (removeTimer !== null) {
				clearTimeout(removeTimer);
				removeTimer = null;
			}

			if (target === hoveredEl) {
				// Same target — already highlighted
			} else {
				hoveredEl?.classList.remove('rf-editable-hover');
				hoveredEl = target;
				hoveredEl?.classList.add('rf-editable-hover');
			}

			if (target) {
				showTooltip(tagLabel(target.tagName), e as MouseEvent);
			} else {
				hideTooltip();
			}
		});

		wrapper.addEventListener('mousemove', (e) => {
			if (tooltip.classList.contains('rf-tooltip-visible')) {
				tooltip.style.left = `${e.clientX + 12}px`;
				tooltip.style.top = `${e.clientY + 12}px`;
			}
		});

		wrapper.addEventListener('mouseout', (e) => {
			const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
			if (hoveredEl && (!related || !hoveredEl.contains(related))) {
				if (removeTimer !== null) clearTimeout(removeTimer);
				const el = hoveredEl;
				removeTimer = setTimeout(() => {
					el.classList.remove('rf-editable-hover');
					if (hoveredEl === el) hoveredEl = null;
					removeTimer = null;
				}, HOVER_DEBOUNCE);
				hideTooltip();
			}
		});

		wrapper.addEventListener('click', (e) => {
			hideTooltip();
			const target = findProseTarget(e.target as HTMLElement, wrapper);
			if (!target) return;

			e.preventDefault();
			e.stopPropagation();

			const childIndex = findChildIndex(target);
			if (childIndex === -1) return;

			const child = block.children[childIndex];
			const rect = target.getBoundingClientRect();
			const tag = target.tagName;

			const info: ProseElementClickInfo = {
				elementType: child.type,
				text: (target.textContent ?? '').trim(),
				rect,
				childIndex,
			};

			if (child.type === 'heading') {
				info.headingLevel = (child as any).level;
			} else if (child.type === 'fence') {
				info.fenceLanguage = (child as any).language ?? '';
				info.fenceCode = (child as any).code ?? '';
			}

			onsectionclick?.(info);
		});
	}

	// ── Hover CSS injected into shadow DOM ───────────────────────
	const hoverCss = `
		/* Block-level elements: invisible outline + transition */
		h1, h2, h3, h4, h5, h6, p, pre, ul, ol, blockquote, hr, table {
			outline: 2px dashed transparent;
			outline-offset: 4px;
			border-radius: 4px;
			transition: outline-color 150ms ease;
		}
		/* Hover affordance */
		.rf-editable-hover {
			outline-color: rgba(59, 130, 246, 0.5);
		}
		.rf-editable-hover, .rf-editable-hover * {
			cursor: text !important;
		}
		/* Hover tooltip */
		.rf-edit-tooltip {
			position: fixed;
			padding: 2px 8px;
			font-family: system-ui, -apple-system, sans-serif;
			font-size: 11px;
			font-weight: 600;
			line-height: 1.4;
			color: #fff;
			background: rgba(30, 41, 59, 0.9);
			border-radius: 4px;
			pointer-events: none;
			z-index: 10000;
			white-space: nowrap;
			opacity: 0;
			transition: opacity 120ms ease;
		}
		.rf-edit-tooltip.rf-tooltip-visible {
			opacity: 1;
		}
	`;

	// ── Preview rendering ───────────────────────────────────────
	$effect(() => {
		if (!previewContainer || !themeConfig) return;

		if (!shadowRoot || shadowRoot.host !== previewContainer) {
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

			if (behaviorCleanup) {
				behaviorCleanup();
				behaviorCleanup = null;
			}

			try {
				const { html } = renderBlockPreview(
					source,
					config,
					hlTransform,
					communityTags ?? undefined,
					communityPostTransforms ?? undefined,
					aggregated,
					communityStyles ?? undefined,
				);
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
					${!readOnly && onsectionclick ? hoverCss : ''}
				</style>
				<div class="rf-preview-wrapper">${html}</div>`;

				const wrapper = shadowRoot.querySelector('.rf-preview-wrapper') as HTMLElement | null;
				if (wrapper) {
					behaviorCleanup = initRuneBehaviors(wrapper);
					wrapper.addEventListener('click', (e) => {
						const anchor = (e.target as HTMLElement).closest('a');
						if (anchor) e.preventDefault();
					}, true);

					// Attach inline-edit hover + click handlers for prose elements
					if (!readOnly && onsectionclick) {
						attachProseHandlers(wrapper);
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
	class="prose-card"
	draggable={dragHandle ? 'true' : 'false'}
	ondragstart={ondragstart}
	ondragover={ondragover}
	ondrop={ondrop}
>
	{#if dragHandle}
		<span class="prose-card__drag" title="Drag to reorder">
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

	{#if themeConfig}
		<div class="prose-card__preview" bind:this={previewContainer}></div>
	{/if}
</div>

<style>
	.prose-card {
		position: relative;
	}

	/* Drag handle */
	.prose-card__drag {
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

	.prose-card:hover .prose-card__drag {
		opacity: 0.35;
	}

	.prose-card:hover .prose-card__drag:hover {
		opacity: 1;
		background: var(--ed-surface-2);
	}

	.prose-card__drag:active {
		cursor: grabbing;
	}

	/* Preview */
	.prose-card__preview {
		overflow: hidden;
	}
</style>
