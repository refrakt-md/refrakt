import { useSchema } from '@refrakt-md/types';
import { Blog, BlogPost } from './schema/blog.js';

export const schema = {
	Blog: useSchema(Blog).defineType('Blog', {}, 'Blog'),
	BlogPost: useSchema(BlogPost).defineType('BlogPost'),
};
