import * as path from 'node:path';
import { Frontmatter } from './frontmatter.js';

export interface Route {
  /** The URL path for this page */
  url: string;
  /** The original relative file path */
  filePath: string;
  /** Whether this page is a draft */
  draft: boolean;
  /** Redirect target, if any */
  redirect?: string;
}

export class Router {
  constructor(private basePath: string = '/') {}

  /**
   * Layer 1: File path → URL path
   * - Strip .md extension
   * - Convert index.md to /
   * - Strip numeric prefixes (01-intro → intro)
   */
  filePathToUrl(relativePath: string): string {
    let url = relativePath
      .replace(/\.md$/, '')
      .split(path.sep)
      .map(segment => segment.replace(/^\d+-/, ''))
      .join('/');

    // index files map to directory root
    if (url.endsWith('/index') || url === 'index') {
      url = url.replace(/\/?index$/, '');
    }

    const base = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;
    return `${base}/${url}` || '/';
  }

  /**
   * Layer 2: Apply frontmatter overrides
   * - slug override replaces the computed URL
   * - draft pages are flagged
   * - redirect pages are flagged
   */
  resolve(relativePath: string, frontmatter: Frontmatter): Route {
    const url = frontmatter.slug
      ? (frontmatter.slug.startsWith('/') ? frontmatter.slug : `${this.basePath}${frontmatter.slug}`)
      : this.filePathToUrl(relativePath);

    return {
      url,
      filePath: relativePath,
      draft: frontmatter.draft === true,
      redirect: frontmatter.redirect,
    };
  }
}
