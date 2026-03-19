import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { corePipelineHooks } from '../src/config.js';
import type { EntityRegistry, EntityRegistration, TransformedPage, PipelineContext } from '@refrakt-md/types';

const { Tag } = Markdoc;

function createMockRegistry(pages: Array<{ url: string; title: string; date?: string; description?: string; draft?: boolean }>): EntityRegistry {
	const entities: EntityRegistration[] = pages.map(p => ({
		type: 'page',
		id: p.url,
		sourceUrl: p.url,
		data: {
			title: p.title,
			url: p.url,
			date: p.date || '',
			description: p.description || '',
			draft: p.draft || false,
		},
	}));

	return {
		register() {},
		getAll(type: string) {
			return type === 'page' ? entities : [];
		},
		getByUrl() { return []; },
		getById() { return undefined; },
		getTypes() { return ['page']; },
	};
}

function createMockCtx(): PipelineContext {
	return {
		info() {},
		warn() {},
		error() {},
	};
}

function createBlogTag(folder: string, sort = 'date-desc', filter = '', limit = ''): InstanceType<typeof Tag> {
	const postsContainer = new Tag('div', { 'data-name': 'posts' }, []);
	return new Tag('section', { 'data-rune': 'blog' }, [
		new Tag('meta', { 'data-field': 'folder', content: folder }),
		new Tag('meta', { 'data-field': 'sort', content: sort }),
		new Tag('meta', { 'data-field': 'filter', content: filter }),
		new Tag('meta', { 'data-field': 'limit', content: limit }),
		postsContainer,
	]);
}

describe('blog pipeline hooks (core)', () => {
	describe('aggregate', () => {
		it('should collect all pages as blog posts', () => {
			const registry = createMockRegistry([
				{ url: '/blog/post-1/', title: 'Post 1', date: '2024-01-15' },
				{ url: '/blog/post-2/', title: 'Post 2', date: '2024-02-20' },
			]);

			const result = corePipelineHooks.aggregate!(registry, createMockCtx()) as any;
			expect(result.allPosts).toHaveLength(2);
			expect(result.allPosts[0].title).toBe('Post 1');
		});
	});

	describe('postProcess', () => {
		it('should inject posts from the specified folder', () => {
			const blogTag = createBlogTag('/blog');
			const page: TransformedPage = {
				url: '/index/',
				title: 'Home',
				headings: [],
				frontmatter: {},
				renderable: blogTag,
			};

			const aggregated = {
				__core__: {
					breadcrumbPaths: new Map(),
					pagesByUrl: new Map(),
					headingIndex: new Map(),
					allPosts: [
						{ title: 'Post A', url: '/blog/post-a/', date: '2024-03-01', description: 'Desc A', draft: false, frontmatter: {} },
						{ title: 'Post B', url: '/blog/post-b/', date: '2024-01-15', description: 'Desc B', draft: false, frontmatter: {} },
						{ title: 'Other', url: '/docs/other/', date: '2024-02-01', description: 'Not a blog', draft: false, frontmatter: {} },
					],
				},
			};

			const result = corePipelineHooks.postProcess!(page, aggregated, createMockCtx());
			const renderable = result.renderable as InstanceType<typeof Tag>;
			const posts = renderable.children.find(
				(c: any) => Tag.isTag(c) && c.attributes['data-name'] === 'posts',
			) as InstanceType<typeof Tag>;

			expect(posts.children).toHaveLength(2);
		});

		it('should sort posts by date descending by default', () => {
			const blogTag = createBlogTag('/blog');
			const page: TransformedPage = {
				url: '/index/',
				title: 'Home',
				headings: [],
				frontmatter: {},
				renderable: blogTag,
			};

			const aggregated = {
				__core__: {
					breadcrumbPaths: new Map(),
					pagesByUrl: new Map(),
					headingIndex: new Map(),
					allPosts: [
						{ title: 'Older', url: '/blog/older/', date: '2024-01-01', description: '', draft: false, frontmatter: {} },
						{ title: 'Newer', url: '/blog/newer/', date: '2024-06-01', description: '', draft: false, frontmatter: {} },
					],
				},
			};

			const result = corePipelineHooks.postProcess!(page, aggregated, createMockCtx());
			const renderable = result.renderable as InstanceType<typeof Tag>;
			const posts = renderable.children.find(
				(c: any) => Tag.isTag(c) && c.attributes['data-name'] === 'posts',
			) as InstanceType<typeof Tag>;

			const firstArticle = posts.children[0] as InstanceType<typeof Tag>;
			const firstTitle = (firstArticle.children[0] as InstanceType<typeof Tag>).children[0] as InstanceType<typeof Tag>;
			expect(firstTitle.children[0]).toBe('Newer');
		});

		it('should filter out draft posts', () => {
			const blogTag = createBlogTag('/blog');
			const page: TransformedPage = {
				url: '/index/',
				title: 'Home',
				headings: [],
				frontmatter: {},
				renderable: blogTag,
			};

			const aggregated = {
				__core__: {
					breadcrumbPaths: new Map(),
					pagesByUrl: new Map(),
					headingIndex: new Map(),
					allPosts: [
						{ title: 'Published', url: '/blog/published/', date: '2024-01-01', description: '', draft: false, frontmatter: {} },
						{ title: 'Draft', url: '/blog/draft/', date: '2024-02-01', description: '', draft: true, frontmatter: {} },
					],
				},
			};

			const result = corePipelineHooks.postProcess!(page, aggregated, createMockCtx());
			const renderable = result.renderable as InstanceType<typeof Tag>;
			const posts = renderable.children.find(
				(c: any) => Tag.isTag(c) && c.attributes['data-name'] === 'posts',
			) as InstanceType<typeof Tag>;

			expect(posts.children).toHaveLength(1);
		});

		it('should respect the limit attribute', () => {
			const blogTag = createBlogTag('/blog', 'date-desc', '', '1');
			const page: TransformedPage = {
				url: '/index/',
				title: 'Home',
				headings: [],
				frontmatter: {},
				renderable: blogTag,
			};

			const aggregated = {
				__core__: {
					breadcrumbPaths: new Map(),
					pagesByUrl: new Map(),
					headingIndex: new Map(),
					allPosts: [
						{ title: 'Post 1', url: '/blog/p1/', date: '2024-01-01', description: '', draft: false, frontmatter: {} },
						{ title: 'Post 2', url: '/blog/p2/', date: '2024-02-01', description: '', draft: false, frontmatter: {} },
						{ title: 'Post 3', url: '/blog/p3/', date: '2024-03-01', description: '', draft: false, frontmatter: {} },
					],
				},
			};

			const result = corePipelineHooks.postProcess!(page, aggregated, createMockCtx());
			const renderable = result.renderable as InstanceType<typeof Tag>;
			const posts = renderable.children.find(
				(c: any) => Tag.isTag(c) && c.attributes['data-name'] === 'posts',
			) as InstanceType<typeof Tag>;

			expect(posts.children).toHaveLength(1);
		});

		it('should sort by title ascending', () => {
			const blogTag = createBlogTag('/blog', 'title-asc');
			const page: TransformedPage = {
				url: '/index/',
				title: 'Home',
				headings: [],
				frontmatter: {},
				renderable: blogTag,
			};

			const aggregated = {
				__core__: {
					breadcrumbPaths: new Map(),
					pagesByUrl: new Map(),
					headingIndex: new Map(),
					allPosts: [
						{ title: 'Zebra', url: '/blog/zebra/', date: '', description: '', draft: false, frontmatter: {} },
						{ title: 'Apple', url: '/blog/apple/', date: '', description: '', draft: false, frontmatter: {} },
					],
				},
			};

			const result = corePipelineHooks.postProcess!(page, aggregated, createMockCtx());
			const renderable = result.renderable as InstanceType<typeof Tag>;
			const posts = renderable.children.find(
				(c: any) => Tag.isTag(c) && c.attributes['data-name'] === 'posts',
			) as InstanceType<typeof Tag>;

			const firstArticle = posts.children[0] as InstanceType<typeof Tag>;
			const firstTitle = (firstArticle.children[0] as InstanceType<typeof Tag>).children[0] as InstanceType<typeof Tag>;
			expect(firstTitle.children[0]).toBe('Apple');
		});

		it('should apply frontmatter filters', () => {
			const blogTag = createBlogTag('/blog', 'date-desc', 'category:tech');
			const page: TransformedPage = {
				url: '/index/',
				title: 'Home',
				headings: [],
				frontmatter: {},
				renderable: blogTag,
			};

			const aggregated = {
				__core__: {
					breadcrumbPaths: new Map(),
					pagesByUrl: new Map(),
					headingIndex: new Map(),
					allPosts: [
						{ title: 'Tech Post', url: '/blog/tech/', date: '2024-01-01', description: '', draft: false, frontmatter: { category: 'tech' } },
						{ title: 'Life Post', url: '/blog/life/', date: '2024-02-01', description: '', draft: false, frontmatter: { category: 'life' } },
					],
				},
			};

			const result = corePipelineHooks.postProcess!(page, aggregated, createMockCtx());
			const renderable = result.renderable as InstanceType<typeof Tag>;
			const posts = renderable.children.find(
				(c: any) => Tag.isTag(c) && c.attributes['data-name'] === 'posts',
			) as InstanceType<typeof Tag>;

			expect(posts.children).toHaveLength(1);
		});
	});
});
