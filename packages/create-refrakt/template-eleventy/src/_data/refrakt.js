import { createDataFile } from '@refrakt-md/eleventy';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
import { resolve } from 'node:path';

const config = loadRefraktConfig(resolve('refrakt.config.json'));
const { site } = resolveSite(config);

export default createDataFile({
	theme: { manifest, layouts },
	contentDir: site.contentDir,
	seo: {
		siteName: site.siteName,
		baseUrl: site.baseUrl,
		defaultImage: site.defaultImage,
		logo: site.logo,
	},
});
