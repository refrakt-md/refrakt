/**
 * Read content from a hidden `<template data-content="name">` or
 * `<div data-content="name" style="display:none">` child.
 * Used for large content (diagram source, sandbox HTML) that the web component
 * needs but shouldn't be visually rendered. Created by postTransform hooks.
 *
 * `<template>` is fiddly: when the HTML *parser* encounters one (the SSR /
 * hard-reload path), children go into the `.content` DocumentFragment. When
 * one is built imperatively via `createElement('template')` + `appendChild`
 * (Svelte 5's client renderer on SPA navigation), children land in the
 * regular child slots and `.content` stays empty. We check both.
 */
export function readHiddenContent(el: HTMLElement, name: string): string {
	const container = el.querySelector<HTMLElement>(`[data-content="${name}"]`);
	if (!container) return '';
	if (container instanceof HTMLTemplateElement) {
		return container.content.textContent || container.textContent || '';
	}
	return container.textContent || '';
}
