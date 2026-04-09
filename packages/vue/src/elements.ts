import type { Component } from 'vue';

export type ElementOverrides = Record<string, Component>;

/** Base element overrides — empty by default. User-defined overrides can be
 *  passed to the Renderer. */
export const elements: ElementOverrides = {};
