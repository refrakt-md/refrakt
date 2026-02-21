/** Cleanup function returned by a behavior — removes event listeners, etc. */
export type CleanupFn = () => void;

/** A behavior function that enhances a rune element. Optionally returns a cleanup function. */
export type BehaviorFn = (el: HTMLElement) => CleanupFn | void;

/** Options for initRuneBehaviors */
export interface InitOptions {
	/** Only initialize behaviors for these rune types */
	only?: string[];
	/** Skip behaviors for these rune types */
	exclude?: string[];
}
