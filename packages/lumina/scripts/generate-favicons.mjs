#!/usr/bin/env node
/**
 * Generate raster favicon variants from the canonical prism SVG.
 *
 * Used by WORK-193 to produce the PNG sizes that browsers, OS chrome, and
 * social cards consume. Run with:
 *
 *   node packages/lumina/scripts/generate-favicons.mjs <output-dir>
 *
 * Defaults to writing into `packages/lumina/assets/logo/`. The site adopts
 * these via WORK-194 by copying or symlinking the resulting PNGs into
 * `site/static/`.
 *
 * Two colour variants are emitted per size:
 *   - `*-light.png` — navy `#1d3557` on transparent (for light browser chrome)
 *   - `*-dark.png`  — white `#ffffff` on transparent (for dark browser chrome)
 *
 * Plus a single composite `favicon.ico` containing the most common pixel
 * sizes (16, 32, 48) — the dark variant, since most refrakt sites render
 * the mark on a dark surface today.
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sourceSvg = readFileSync(resolve(here, '..', 'assets', 'logo', 'prism.svg'), 'utf-8');
const outputDir = process.argv[2]
	? resolve(process.cwd(), process.argv[2])
	: resolve(here, '..', 'assets', 'logo');

mkdirSync(outputDir, { recursive: true });

const sizes = [16, 24, 32, 48, 64, 96, 180, 192, 512];

/** Replace the embedded media-query CSS with a fixed-colour stylesheet for
 *  raster output. We strip the prefers-color-scheme block entirely so the
 *  rasterised PNG carries one definite colour (sharp ignores @media). */
function svgWithFixedColor(hex) {
	return sourceSvg.replace(
		/<style>[^<]*<\/style>/,
		`<style>:where(svg){color:${hex}}</style>`,
	);
}

async function render(svg, size) {
	return sharp(Buffer.from(svg))
		.resize(size, size)
		.png({ compressionLevel: 9 })
		.toBuffer();
}

async function main() {
	const lightSvg = svgWithFixedColor('#1d3557');
	const darkSvg = svgWithFixedColor('#ffffff');

	for (const size of sizes) {
		const lightPng = await render(lightSvg, size);
		const darkPng = await render(darkSvg, size);
		writeFileSync(resolve(outputDir, `prism-${size}-light.png`), lightPng);
		writeFileSync(resolve(outputDir, `prism-${size}-dark.png`), darkPng);
	}

	console.log(`Wrote ${sizes.length * 2} PNG variants to ${outputDir}`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
