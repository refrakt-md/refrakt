import 'reflect-metadata';
import { runes, tags, nodes, mergePackages, defineRune, runeTagMap } from '@refrakt-md/runes';
import type { Rune, LoadedPackage } from '@refrakt-md/runes';
import type { SchemaAttribute, Schema } from '@markdoc/markdoc';
import Markdoc from '@markdoc/markdoc';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

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
  /** Editor UI category (e.g., 'Content', 'Layout') */
  category: string | undefined;
}

/** Map of every name (primary + alias) → RuneInfo */
const runesByName = new Map<string, RuneInfo>();

/** All unique RuneInfo objects (one per rune, not per alias) */
const allRunes: RuneInfo[] = [];

/** Merged Markdoc tags (core + community) */
let mergedTags: Record<string, Schema> = { ...tags, ...Markdoc.tags };

/** Registered partial file names (relative to _partials/) */
const partialNames: string[] = [];

/** Absolute path to _partials/ directory (if found) */
let partialsDir: string | null = null;

/** Markdoc nodes config */
const markdocNodes = nodes;

// Index core runes immediately (sync, always available)
indexRunes(Object.values(runes) as Rune[]);

/** Index an array of Rune instances into the registry */
function indexRunes(runeList: Rune[]) {
  for (const rune of runeList) {
    // Skip if primary name already registered (core takes precedence during initial load)
    if (runesByName.has(rune.name)) continue;

    const info: RuneInfo = {
      name: rune.name,
      allNames: rune.names,
      description: rune.description,
      reinterprets: rune.reinterprets,
      seoType: rune.seoType,
      attributes: (rune.schema.attributes ?? {}) as Record<string, SchemaAttribute>,
      category: rune.category,
    };
    allRunes.push(info);
    for (const name of rune.names) {
      if (!runesByName.has(name)) {
        runesByName.set(name, info);
      }
    }
  }
}

/** Shape of a community RunePackage export */
interface RunePackageLike {
  name: string;
  displayName?: string;
  version: string;
  runes: Record<string, {
    transform: Record<string, unknown>;
    description?: string;
    aliases?: string[];
    seoType?: string;
    reinterprets?: Record<string, string>;
    fixture?: string;
    category?: string;
    snippet?: string[];
  }>;
  theme?: Record<string, unknown>;
}

/** Type guard for RunePackage shape */
function isRunePackage(value: unknown): value is RunePackageLike {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.version === 'string' && typeof obj.runes === 'object' && obj.runes !== null;
}

/** Find the RunePackage export from a required module */
function findRunePackageExport(mod: Record<string, unknown>, npmName: string): RunePackageLike {
  if (mod.default && isRunePackage(mod.default)) {
    return mod.default;
  }
  for (const value of Object.values(mod)) {
    if (isRunePackage(value)) {
      return value;
    }
  }
  throw new Error(`Package "${npmName}" does not export a valid RunePackage object.`);
}

/**
 * Load a community package using createRequire rooted at the workspace.
 * This is necessary because the language server is bundled by esbuild,
 * so bare import() resolves from the bundle's location, not the user's workspace.
 */
function loadPackageFromWorkspace(req: NodeRequire, npmName: string): LoadedPackage {
  const mod = req(npmName) as Record<string, unknown>;
  const pkgExport = findRunePackageExport(mod, npmName);

  const runeInstances: Record<string, Rune> = {};
  const fixtures: Record<string, string> = {};

  for (const [runeName, entry] of Object.entries(pkgExport.runes)) {
    runeInstances[runeName] = defineRune({
      name: runeName,
      schema: entry.transform as Schema,
      description: entry.description ?? `Community rune from ${pkgExport.displayName ?? pkgExport.name}`,
      aliases: entry.aliases,
      seoType: entry.seoType,
      reinterprets: entry.reinterprets,
      category: entry.category,
    });
    if (entry.fixture) {
      fixtures[runeName] = entry.fixture;
    }
  }

  // Cast to LoadedPackage — the pkg field expects RunePackage from @refrakt-md/types
  // but our RunePackageLike has the same shape
  return { pkg: pkgExport as any, npmName, runes: runeInstances, fixtures };
}

/**
 * Find refrakt.config.json in the workspace.
 * Checks the workspace root first, then immediate subdirectories
 * (handles monorepo setups where the config is in e.g. `site/`).
 */
function findConfigFile(workspaceRoot: string): string | null {
  const rootConfig = join(workspaceRoot, 'refrakt.config.json');
  if (existsSync(rootConfig)) return rootConfig;

  // Search immediate subdirectories
  try {
    for (const entry of readdirSync(workspaceRoot)) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      const subdir = join(workspaceRoot, entry);
      try {
        if (!statSync(subdir).isDirectory()) continue;
      } catch { continue; }
      const subConfig = join(subdir, 'refrakt.config.json');
      if (existsSync(subConfig)) return subConfig;
    }
  } catch { /* ignore readdir errors */ }

  return null;
}

/**
 * Initialize the registry with community packages from the workspace.
 * Core runes are already indexed; this adds community package runes
 * by reading refrakt.config.json and loading configured packages.
 */
export async function initializeRegistry(workspaceRoot?: string): Promise<void> {
  if (!workspaceRoot) return;

  try {
    const configPath = findConfigFile(workspaceRoot);
    if (!configPath) return;

    const configText = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configText);

    const configDir = dirname(configPath);

    // Scan _partials/ directory
    const contentDir = config.contentDir ?? 'content';
    const resolvedPartialsDir = join(configDir, contentDir, '_partials');
    scanPartialsDir(resolvedPartialsDir);

    const packageNames: string[] = config.packages ?? [];
    if (packageNames.length === 0) return;

    // Use createRequire rooted at the config's directory so packages resolve
    // from the project's node_modules, not the bundled server's location
    const req = createRequire(join(configDir, 'package.json'));

    const loaded: LoadedPackage[] = [];
    for (const name of packageNames) {
      try {
        loaded.push(loadPackageFromWorkspace(req, name));
      } catch (err: any) {
        console.warn(`[refrakt] Failed to load package "${name}":`, err?.message ?? err);
      }
    }

    if (loaded.length === 0) return;

    const coreRuneNames = new Set(Object.keys(runes));
    const merged = mergePackages(loaded, coreRuneNames, config.runes?.prefer);

    // Index community runes
    indexRunes(Object.values(merged.runes) as Rune[]);

    // Rebuild merged tags map
    mergedTags = { ...runeTagMap(runes), ...merged.tags, ...Markdoc.tags };
  } catch (err: any) {
    console.warn('[refrakt] Community package loading failed:', err?.message ?? err);
  }
}

/** Recursively scan _partials/ directory and populate partialNames */
function scanPartialsDir(dir: string): void {
  partialNames.length = 0;
  partialsDir = null;

  if (!existsSync(dir) || !statSync(dir).isDirectory()) return;

  partialsDir = dir;

  function walk(currentDir: string): void {
    for (const entry of readdirSync(currentDir)) {
      if (entry.startsWith('.')) continue;
      const fullPath = join(currentDir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (stat.isFile() && entry.endsWith('.md')) {
          // Store relative path from _partials/ root
          const relativePath = fullPath.slice(partialsDir!.length + 1);
          partialNames.push(relativePath);
        }
      } catch { /* skip unreadable entries */ }
    }
  }

  walk(dir);
  partialNames.sort();
}

/**
 * Re-initialize the registry (e.g. when refrakt.config.json changes).
 * Clears community runes and re-loads from config.
 */
export async function reinitialize(workspaceRoot?: string): Promise<void> {
  // Clear existing entries
  runesByName.clear();
  allRunes.length = 0;
  mergedTags = { ...tags, ...Markdoc.tags };

  // Re-index core runes
  indexRunes(Object.values(runes) as Rune[]);

  // Load community packages
  await initializeRegistry(workspaceRoot);
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
  return mergedTags;
}

/** Get the Markdoc nodes config for validation/parsing */
export function getMarkdocNodes() {
  return markdocNodes;
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

/** Get all registered partial file names */
export function getPartialNames(): readonly string[] {
  return partialNames;
}

/** Check whether a partial file exists */
export function hasPartial(name: string): boolean {
  return partialNames.includes(name);
}

/** Get the absolute path to the _partials/ directory (null if not found) */
export function getPartialsDir(): string | null {
  return partialsDir;
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
