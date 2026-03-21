import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ContentPage {
  /** Absolute file path */
  filePath: string;
  /** Relative path from content root */
  relativePath: string;
  /** Raw file content */
  raw: string;
}

export interface PartialFile {
  /** Key used in Markdoc config.partials (e.g., "cta.md" or "shared/cta.md") */
  name: string;
  /** Absolute file path */
  filePath: string;
  /** Raw markdown content */
  raw: string;
}

export interface ContentDirectory {
  /** Directory name */
  name: string;
  /** Absolute path */
  dirPath: string;
  /** Child pages */
  pages: ContentPage[];
  /** Child directories */
  children: ContentDirectory[];
  /** Layout file in this directory, if any */
  layout?: ContentPage;
}

export interface ContentNode {
  page: ContentPage;
  directory: ContentDirectory;
}

export class ContentTree {
  private _partials: Map<string, PartialFile> | undefined;

  constructor(public readonly root: ContentDirectory) {}

  /** Recursively walk a content directory and build the tree */
  static async fromDirectory(dirPath: string): Promise<ContentTree> {
    const root = await readDirectory(dirPath, dirPath);
    const tree = new ContentTree(root);
    tree._partials = await readPartials(dirPath);
    return tree;
  }

  /** All pages in the tree (depth-first) */
  *pages(): Generator<ContentPage> {
    yield* walkPages(this.root);
  }

  /** All layout files in the tree (depth-first) */
  *layouts(): Generator<ContentPage> {
    yield* walkLayouts(this.root);
  }

  /** All partial files from the _partials/ directory at content root */
  partials(): Map<string, PartialFile> {
    return this._partials ?? new Map();
  }
}

async function readDirectory(dirPath: string, rootPath: string): Promise<ContentDirectory> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const dir: ContentDirectory = {
    name: path.basename(dirPath),
    dirPath,
    pages: [],
    children: [],
  };

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '_partials') {
      dir.children.push(await readDirectory(fullPath, rootPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const raw = await fs.promises.readFile(fullPath, 'utf-8');
      const page: ContentPage = {
        filePath: fullPath,
        relativePath: path.relative(rootPath, fullPath),
        raw,
      };

      if (entry.name === '_layout.md') {
        dir.layout = page;
      } else {
        dir.pages.push(page);
      }
    }
  }

  // Sort pages by name for deterministic ordering
  dir.pages.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  dir.children.sort((a, b) => a.name.localeCompare(b.name));

  return dir;
}

function* walkPages(dir: ContentDirectory): Generator<ContentPage> {
  for (const page of dir.pages) {
    yield page;
  }
  for (const child of dir.children) {
    yield* walkPages(child);
  }
}

function* walkLayouts(dir: ContentDirectory): Generator<ContentPage> {
  if (dir.layout) {
    yield dir.layout;
  }
  for (const child of dir.children) {
    yield* walkLayouts(child);
  }
}

/** Read all .md files in _partials/ at the content root (recursively). */
async function readPartials(rootPath: string): Promise<Map<string, PartialFile>> {
  const partialsDir = path.join(rootPath, '_partials');
  const map = new Map<string, PartialFile>();

  try {
    await fs.promises.access(partialsDir);
  } catch {
    return map; // No _partials/ directory — that's fine
  }

  await scanPartials(partialsDir, partialsDir, map);
  return map;
}

async function scanPartials(
  dirPath: string,
  partialsRoot: string,
  map: Map<string, PartialFile>,
): Promise<void> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      await scanPartials(fullPath, partialsRoot, map);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const raw = await fs.promises.readFile(fullPath, 'utf-8');
      const name = path.relative(partialsRoot, fullPath);
      map.set(name, { name, filePath: fullPath, raw });
    }
  }
}
