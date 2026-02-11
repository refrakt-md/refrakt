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
  constructor(public readonly root: ContentDirectory) {}

  /** Recursively walk a content directory and build the tree */
  static async fromDirectory(dirPath: string): Promise<ContentTree> {
    const root = await readDirectory(dirPath, dirPath);
    return new ContentTree(root);
  }

  /** All pages in the tree (depth-first) */
  *pages(): Generator<ContentPage> {
    yield* walkPages(this.root);
  }

  /** All layout files in the tree (depth-first) */
  *layouts(): Generator<ContentPage> {
    yield* walkLayouts(this.root);
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

    if (entry.isDirectory() && !entry.name.startsWith('.')) {
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
