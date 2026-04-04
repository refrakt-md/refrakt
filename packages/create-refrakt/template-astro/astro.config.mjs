import { defineConfig } from 'astro/config';
import { refrakt } from '@refrakt-md/astro';

export default defineConfig({
	integrations: [refrakt()],
});
