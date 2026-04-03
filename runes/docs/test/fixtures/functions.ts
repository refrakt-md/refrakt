/**
 * Renders content from a source string.
 * @param source - Raw Markdoc content to parse
 * @param options - Configuration for the render pass
 * @returns The rendered tree
 * @since 1.0.0
 * @throws ParseError if the source is invalid
 */
export function renderContent(source: string, options?: RenderOptions): RenderTree {
	return {} as RenderTree;
}

/** A simple utility with no params */
export function noop(): void {}

/**
 * @deprecated 2.0.0
 */
export function legacyRender(source: string): any {
	return null;
}

/** An arrow function export */
export const createParser = (strict: boolean = false): Parser => {
	return {} as Parser;
};

/**
 * A hook (name starts with 'use')
 * @param initial - The initial value
 */
export function useCounter(initial: number = 0): [number, () => void] {
	return [initial, () => {}];
}

interface RenderOptions {
	runes?: Record<string, any>;
	variables?: Record<string, any>;
}

interface RenderTree {
	nodes: any[];
}

interface Parser {
	parse(input: string): any;
}
