/** Configuration for the theme system */
export interface ThemeOptions {
	/** The theme name */
	name: string;

	/** Theme version string */
	version?: string;

	/**
	 * Apply the theme to an element.
	 * @param element - Target DOM element
	 * @returns Whether the theme was applied successfully
	 */
	apply(element: HTMLElement): boolean;
}
