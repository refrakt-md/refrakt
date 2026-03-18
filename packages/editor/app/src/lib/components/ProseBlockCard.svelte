<script lang="ts">
	import type { ProseBlock } from '../editor/block-parser.js';
	import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
	import { renderBlockPreview } from '../preview/block-renderer.js';
	import { initRuneBehaviors } from '@refrakt-md/behaviors';

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
		editing?: boolean;
		onclickpreview?: () => void;
		onsourcechange?: (newSource: string) => void;
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
		editing = false,
		onclickpreview,
		onsourcechange,
		ondragstart,
		ondragover,
		ondrop,
	}: Props = $props();

	// ── Shadow DOM preview ─────────────────────────────────────
	let previewContainer: HTMLDivElement | undefined = $state();
	let shadowRoot: ShadowRoot | null = null;
	let previewDebounce: ReturnType<typeof setTimeout>;
	let behaviorCleanup: (() => void) | null = null;

	// ── Textarea auto-resize ────────────────────────────────────
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let editSource = $state('');

	$effect(() => {
		if (editing) {
			editSource = block.source;
			// Focus textarea on next tick
			requestAnimationFrame(() => {
				if (textareaEl) {
					textareaEl.focus();
					autoResize(textareaEl);
				}
			});
		}
	});

	function autoResize(el: HTMLTextAreaElement) {
		el.style.height = 'auto';
		el.style.height = el.scrollHeight + 'px';
	}

	function handleInput(e: Event) {
		const textarea = e.target as HTMLTextAreaElement;
		editSource = textarea.value;
		autoResize(textarea);
	}

	function handleBlur() {
		onsourcechange?.(editSource);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onsourcechange?.(editSource);
		}
		// Allow Tab to insert a tab character (useful for code blocks, lists)
		if (e.key === 'Tab') {
			e.preventDefault();
			const textarea = e.target as HTMLTextAreaElement;
			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			editSource = editSource.slice(0, start) + '\t' + editSource.slice(end);
			requestAnimationFrame(() => {
				textarea.selectionStart = textarea.selectionEnd = start + 1;
			});
		}
	}

	// ── Preview rendering ───────────────────────────────────────
	$effect(() => {
		if (editing || !previewContainer || !themeConfig) return;

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
				</style>
				<div class="rf-preview-wrapper">${html}</div>`;

				const wrapper = shadowRoot.querySelector('.rf-preview-wrapper') as HTMLElement | null;
				if (wrapper) {
					behaviorCleanup = initRuneBehaviors(wrapper);
					wrapper.addEventListener('click', (e) => {
						const anchor = (e.target as HTMLElement).closest('a');
						if (anchor) e.preventDefault();
					}, true);
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
	class:prose-card--editing={editing}
	draggable={dragHandle && !editing ? 'true' : 'false'}
	ondragstart={ondragstart}
	ondragover={ondragover}
	ondrop={ondrop}
>
	{#if dragHandle && !editing}
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

	{#if editing}
		<!-- Edit mode: markdown textarea -->
		<div class="prose-card__editor">
			<textarea
				bind:this={textareaEl}
				class="prose-card__textarea"
				value={editSource}
				oninput={handleInput}
				onblur={handleBlur}
				onkeydown={handleKeydown}
				spellcheck="true"
			></textarea>
		</div>
	{:else if themeConfig}
		<!-- View mode: rendered preview -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="prose-card__preview"
			bind:this={previewContainer}
			onclick={() => { if (!readOnly) onclickpreview?.(); }}
			role={readOnly ? undefined : 'button'}
			tabindex={readOnly ? undefined : 0}
		></div>
	{/if}
</div>

<style>
	.prose-card {
		position: relative;
	}

	.prose-card--editing {
		border-left: 3px solid var(--ed-accent, #3b82f6);
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

	/* Preview — click to edit */
	.prose-card__preview {
		overflow: hidden;
		cursor: text;
	}

	/* Editor */
	.prose-card__editor {
		padding: 0.5rem;
	}

	.prose-card__textarea {
		width: 100%;
		min-height: 4rem;
		padding: 0.75rem 1rem;
		font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
		font-size: 13px;
		line-height: 1.6;
		color: var(--ed-text, #e2e8f0);
		background: var(--ed-surface-1, #1e293b);
		border: 1px solid var(--ed-border, #334155);
		border-radius: var(--ed-radius, 6px);
		resize: none;
		overflow: hidden;
		outline: none;
		tab-size: 4;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.prose-card__textarea:focus {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
	}
</style>
