/** A mapping of rune names to definitions */
export type RuneMap = Record<string, RuneDefinition>;

/** Callback for handling events */
export type EventHandler<T = unknown> = (event: T) => void;

interface RuneDefinition {
	name: string;
}
