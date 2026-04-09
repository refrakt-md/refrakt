import type { ComponentType } from 'react';

export type ElementOverrides = Record<string, ComponentType<any>>;

/** Base element overrides — empty by default. User-defined overrides can be
 *  passed to the Renderer. */
export const elements: ElementOverrides = {};
