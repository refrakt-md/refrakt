/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'export',
	transpilePackages: [
		'@markdoc/markdoc',
		'@refrakt-md/runes',
		'@refrakt-md/content',
		'@refrakt-md/types',
		'@refrakt-md/next',
		'@refrakt-md/transform',
	],
};

export default nextConfig;
