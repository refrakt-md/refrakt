<script lang="ts">
	import type { Snippet } from 'svelte';
	import { editorState } from '../state/editor.svelte.js';

	interface Props {
		header: Snippet;
		left: Snippet;
		center: Snippet;
		right: Snippet;
	}

	let { header, left, center, right }: Props = $props();

	let mainWidth = $state(0);

	const LEFT_WIDTH = 360;

	let contentColumns = $derived.by(() => {
		if (editorState.editorMode === 'code') {
			return '1fr 1fr';
		}
		return '0px 1fr';
	});

	const codeCenterWidth = $derived(
		Math.floor(Math.max(0, mainWidth) / 2)
	);
</script>

<div class="layout" class:layout--sidenav-closed={!editorState.sidenavOpen}>
	<div class="layout__left" style="width: {LEFT_WIDTH}px">
		{@render left()}
	</div>
	<div class="layout__main" bind:clientWidth={mainWidth}>
		<div class="layout__header">
			{@render header()}
		</div>
		<div class="layout__content" style="grid-template-columns: {contentColumns}">
			<div class="layout__panel layout__panel--center">
				<div class="layout__center-inner" class:slide-out={editorState.editorMode !== 'code'} style="min-width: {codeCenterWidth}px">
					{@render center()}
				</div>
			</div>
			<div class="layout__panel layout__panel--right" class:panel-editing={editorState.editPanelOpen}>
				{@render right()}
			</div>
		</div>
	</div>
</div>

<style>
	.layout {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.layout__left {
		flex-shrink: 0;
		background: var(--ed-surface-1);
		border-right: 1px solid var(--ed-border-default);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transition: margin-left var(--ed-transition-slow), opacity var(--ed-transition-slow);
	}

	.layout--sidenav-closed .layout__left {
		margin-left: -360px;
	}

	.layout__main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-width: 0;
	}

	.layout__header {
		flex-shrink: 0;
	}

	.layout__content {
		display: grid;
		flex: 1;
		overflow: hidden;
		transition: grid-template-columns var(--ed-transition-slow);
	}

	.layout__panel {
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.layout__panel--center {
		background: var(--ed-surface-0);
	}

	.layout__center-inner {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		transition: transform var(--ed-transition-slow);
	}

	.layout__center-inner.slide-out {
		transform: translateX(-100%);
	}

	.layout__panel--right {
		background: var(--ed-surface-1);
		align-items: center;
		transition: padding-right var(--ed-transition-slow);
	}

	.layout__panel--right.panel-editing {
		padding-right: 480px;
	}
</style>
