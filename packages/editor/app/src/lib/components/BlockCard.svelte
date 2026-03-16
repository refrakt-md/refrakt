<script lang="ts">
	import type { ParsedBlock } from '../editor/block-parser.js';
	import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
	import { renderBlockPreview } from '../preview/block-renderer.js';
	import { initRuneBehaviors } from '@refrakt-md/behaviors';
	import { isEditableSection } from '../editor/section-mapper.js';

	export type EditType = 'inline' | 'link' | 'code';

	export interface SectionClickInfo {
		dataName: string;
		text: string;
		rect: DOMRect;
		editType: EditType;
		/** For link-type edits: the href from the <a> child */
		href?: string;
	}

	type InteractiveTarget =
		| { type: 'section'; el: HTMLElement; dataName: string; editType: EditType }
		| { type: 'rune'; el: HTMLElement };

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
		readOnly?: boolean;
		onsectionclick?: (info: SectionClickInfo) => void;
		onruneclick?: () => void;
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
		onruneclick,
		ondragstart,
		ondragover,
		ondrop,
	}: Props = $props();

	// ── Inline preview via Shadow DOM ─────────────────────────────
	let previewContainer: HTMLDivElement | undefined = $state();
	let shadowRoot: ShadowRoot | null = null;
	let previewDebounce: ReturnType<typeof setTimeout>;
	let behaviorCleanup: (() => void) | null = null;

	/** Convert PascalCase to kebab-case: "CallToAction" → "call-to-action" */
	function toKebab(s: string): string {
		return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
	}

	/** Build a lookup map from kebab-case data-rune values to RuneConfig */
	function buildRuneConfigMap(config: ThemeConfig): Map<string, import('@refrakt-md/transform').RuneConfig> {
		const map = new Map<string, import('@refrakt-md/transform').RuneConfig>();
		for (const [key, cfg] of Object.entries(config.runes)) {
			map.set(toKebab(key), cfg);
		}
		return map;
	}

	/** Find the nearest interactive target: an editable data-name section, or a data-rune root.
	 *  Editable data-name sections take priority; data-rune is the fallback for dead-space clicks. */
	function findInteractiveTarget(
		start: HTMLElement,
		root: HTMLElement,
		runeConfigMap: Map<string, import('@refrakt-md/transform').RuneConfig>,
	): InteractiveTarget | null {
		let el: HTMLElement | null = start;
		let dataNameEl: HTMLElement | null = null;
		let dataRuneEl: HTMLElement | null = null;

		// Walk up to find the nearest data-name and data-rune elements
		while (el && el !== root) {
			if (el.hasAttribute('data-name') && !dataNameEl) {
				dataNameEl = el;
			}
			if (el.hasAttribute('data-rune') && !dataRuneEl) {
				dataRuneEl = el;
			}
			el = el.parentElement;
		}

		// Try editable data-name section first (takes priority)
		if (dataNameEl) {
			const dataName = dataNameEl.getAttribute('data-name')!;

			// Find containing rune's config for editHints lookup
			let configEl: HTMLElement | null = dataNameEl.parentElement;
			let runeConfig: import('@refrakt-md/transform').RuneConfig | undefined;
			while (configEl && configEl !== root) {
				const runeType = configEl.getAttribute('data-rune');
				if (runeType) {
					runeConfig = runeConfigMap.get(runeType);
					break;
				}
				configEl = configEl.parentElement;
			}

			const hint = runeConfig?.editHints?.[dataName];

			if (hint !== 'none') {
				if (hint === 'link' || hint === 'inline' || hint === 'code') {
					return { type: 'section', el: dataNameEl, dataName, editType: hint };
				}
				if (isEditableSection(dataNameEl)) {
					return { type: 'section', el: dataNameEl, dataName, editType: 'inline' };
				}
			}
			// data-name found but not editable — fall through to rune
		}

		// Fall back to data-rune element
		if (dataRuneEl) {
			return { type: 'rune', el: dataRuneEl };
		}

		return null;
	}

	/** Attach click and hover handlers to interactive elements within the wrapper */
	function attachSectionHandlers(wrapper: HTMLElement, runeConfigMap: Map<string, import('@refrakt-md/transform').RuneConfig>) {
		let hoveredEl: HTMLElement | null = null;

		wrapper.addEventListener('mouseover', (e) => {
			const result = findInteractiveTarget(e.target as HTMLElement, wrapper, runeConfigMap);
			const target = result?.el ?? null;
			if (target !== hoveredEl) {
				hoveredEl?.classList.remove('rf-editable-hover');
				hoveredEl = target;
				hoveredEl?.classList.add('rf-editable-hover');
			}
		});

		wrapper.addEventListener('mouseout', (e) => {
			const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
			if (hoveredEl && (!related || !hoveredEl.contains(related))) {
				hoveredEl.classList.remove('rf-editable-hover');
				hoveredEl = null;
			}
		});

		wrapper.addEventListener('click', (e) => {
			const result = findInteractiveTarget(e.target as HTMLElement, wrapper, runeConfigMap);
			if (!result) return;

			e.preventDefault();
			e.stopPropagation();

			if (result.type === 'section') {
				const { el, dataName, editType } = result;
				const rect = el.getBoundingClientRect();
				// For link edits, extract the href from the <a> child
				const anchor = editType === 'link' ? el.querySelector('a') as HTMLAnchorElement | null : null;
				// For code edits, extract text from the <code> element to avoid
				// picking up structural text (language labels, copy buttons, etc.)
				const codeEl = editType === 'code' ? el.querySelector('code') : null;
				onsectionclick?.({
					dataName,
					text: (codeEl ?? el).textContent?.trim() ?? '',
					rect,
					editType,
					href: anchor?.getAttribute('href') ?? undefined,
				});
			} else {
				// type === 'rune' → open block edit panel
				onruneclick?.();
			}
		});
	}

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
						/* Editable section hover affordance */
						[data-name].rf-editable-hover {
							outline: 2px dashed rgba(59, 130, 246, 0.5);
							outline-offset: 4px;
							border-radius: 4px;
							cursor: text;
						}
						[data-name].rf-editable-hover,
						[data-name].rf-editable-hover * {
							cursor: text !important;
						}
						/* Rune root hover affordance — opens block edit panel */
						[data-rune].rf-editable-hover {
							outline: 2px dashed rgba(59, 130, 246, 0.3);
							outline-offset: 4px;
							border-radius: 4px;
						}
						[data-rune].rf-editable-hover,
						[data-rune].rf-editable-hover * {
							cursor: pointer !important;
						}
					</style>
					<div class="rf-preview-wrapper">${html}</div>`;

					// Run behaviors (tabs, accordion, copy, etc.) on the rendered content
					const wrapper = shadowRoot.querySelector('.rf-preview-wrapper') as HTMLElement | null;
					if (wrapper) {
						behaviorCleanup = initRuneBehaviors(wrapper);

						// Prevent link navigation in preview (editor is for editing, not browsing)
						wrapper.addEventListener('click', (e) => {
							const anchor = (e.target as HTMLElement).closest('a');
							if (anchor) e.preventDefault();
						}, true);

						// Attach inline-edit click + hover handlers for rune sections
						if (!readOnly && (onsectionclick || onruneclick) && block.type === 'rune') {
							attachSectionHandlers(wrapper, buildRuneConfigMap(config));
						}
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
