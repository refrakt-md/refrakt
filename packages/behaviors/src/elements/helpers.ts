/**
 * Read content from a hidden `<template data-content="name">` or
 * `<div data-content="name" style="display:none">` child.
 * Used for large content (diagram source, sandbox HTML) that the web component
 * needs but shouldn't be visually rendered. Created by postTransform hooks.
 */
export function readHiddenContent(el: HTMLElement, name: string): string {
	const container = el.querySelector<HTMLElement>(`[data-content="${name}"]`);
	if (!container) return '';
	// <template> elements store content in a DocumentFragment
	if (container instanceof HTMLTemplateElement) {
		return container.content.textContent || '';
	}
	return container.textContent || '';
}
