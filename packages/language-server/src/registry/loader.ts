import 'reflect-metadata';
import { runes, tags, nodes } from '@refrakt-md/runes';
import type { Rune } from '@refrakt-md/runes';
import type { SchemaAttribute } from '@markdoc/markdoc';

export interface RuneInfo {
  /** Primary rune name */
  name: string;
  /** All names (primary + aliases) */
  allNames: string[];
  /** Human-readable description */
  description: string;
  /** How this rune reinterprets Markdown primitives */
  reinterprets: Record<string, string>;
  /** Schema.org SEO type, if any */
  seoType: string | undefined;
  /** Attribute definitions from the schema */
  attributes: Record<string, SchemaAttribute>;
}

/** Map of every name (primary + alias) → RuneInfo */
const runesByName = new Map<string, RuneInfo>();

/** All unique RuneInfo objects (one per rune, not per alias) */
const allRunes: RuneInfo[] = [];

// Build the index
for (const rune of Object.values(runes) as Rune[]) {
  const info: RuneInfo = {
    name: rune.name,
    allNames: rune.names,
    description: rune.description,
    reinterprets: rune.reinterprets,
    seoType: rune.seoType,
    attributes: (rune.schema.attributes ?? {}) as Record<string, SchemaAttribute>,
  };
  allRunes.push(info);
  for (const name of rune.names) {
    runesByName.set(name, info);
  }
}

/** Look up a rune by any of its names (primary or alias) */
export function getRune(name: string): RuneInfo | undefined {
  return runesByName.get(name);
}

/** Get all registered runes (one entry per rune, not per alias) */
export function getAllRunes(): readonly RuneInfo[] {
  return allRunes;
}

/** Get all name→RuneInfo mappings (includes aliases) */
export function getAllNames(): ReadonlyMap<string, RuneInfo> {
  return runesByName;
}

/** Get the Markdoc tags config for validation/parsing */
export function getMarkdocTags() {
  return tags;
}

/** Get the Markdoc nodes config for validation/parsing */
export function getMarkdocNodes() {
  return nodes;
}

/** Simple Levenshtein distance */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Find rune names similar to the given name, sorted by distance */
export function findSimilar(name: string, maxDistance = 3): string[] {
  const results: Array<{ name: string; distance: number }> = [];

  for (const rune of allRunes) {
    const distance = levenshtein(name, rune.name);
    if (distance <= maxDistance && distance > 0) {
      results.push({ name: rune.name, distance });
    }
    // Also check aliases
    for (const alias of rune.allNames.slice(1)) {
      const d = levenshtein(name, alias);
      if (d <= maxDistance && d > 0) {
        results.push({ name: alias, distance: d });
      }
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.map(r => r.name);
}
