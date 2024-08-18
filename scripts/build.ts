import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {$, Glob, file, write} from 'bun';
import {titleToSlug} from 'simple-icons-13/sdk';
import packageJson from '../package.json';
import type {Icon, IconJson} from './types';
import {getExportName, normalizeSlug} from './utils';

const svgGlob = new Glob('*.svg');
const packagePrefix = 'simple-icons-';
const projectRoot = join(import.meta.dirname, '..');
const nodeModulesRoot = join(projectRoot, 'node_modules');
const buildDestination = join(projectRoot, 'distribution');
const svgDestination = join(projectRoot, 'icons');

const versions = Object.keys(packageJson.devDependencies).filter((name) =>
	name.startsWith(packagePrefix),
);

versions.sort((a, b) => a.localeCompare(b));

await mkdir(svgDestination, {recursive: true});
for (const [index, version] of versions.entries()) {
	// eslint-disable-next-line no-await-in-loop
	await $`cp *.svg '${svgDestination}'`.cwd(
		join(nodeModulesRoot, version, 'icons'),
	);
	console.log('Copy verseion', index + 1, 'to icons.');
}

const allSlugs = [...svgGlob.scanSync(svgDestination)].map((x) =>
	x.replace(/\.svg$/, ''),
);

const invalidSlugs = allSlugs.filter((slug) => slug.includes('-'));
for (const slug of invalidSlugs) {
	// eslint-disable-next-line no-await-in-loop
	await $`mv '${slug}.svg' '${normalizeSlug(slug)}.svg'`.cwd(svgDestination);
}

const slugs = [...new Set(allSlugs.map((x) => normalizeSlug(x)))];
const icons: Icon[] = [];
const previousIcons: Record<string, string[]> = {};

for (const slug of slugs) {
	// eslint-disable-next-line no-await-in-loop
	const svgFile = await file(join(svgDestination, `${slug}.svg`)).text();

	for (const [index, version] of versions.slice().reverse().entries()) {
		const dataJsonPath = join(
			nodeModulesRoot,
			version,
			'_data',
			'simple-icons.json',
		);
		// eslint-disable-next-line no-await-in-loop
		const dataJson = (await import(dataJsonPath)) as IconJson;
		const foundIcon = dataJson.icons.find((icon) => {
			const iconSlug = icon.slug ?? titleToSlug(icon.title);
			return iconSlug === slug;
		});
		if (foundIcon) {
			icons.push({
				title: foundIcon.title,
				slug,
				hex: foundIcon.hex,
				svg: svgFile,
			});

			if (index > 0) {
				const v = versions.length - index;
				// eslint-disable-next-line max-depth
				if (!Array.isArray(previousIcons[v])) {
					previousIcons[v] = [];
				}

				previousIcons[v].push(slug);
			}

			break;
		} else {
			continue;
		}
	}
}

console.log('Found', icons.length, 'icons.');
console.log('\nPrevious icons summary:');
for (const [version, slugs] of Object.entries(previousIcons)) {
	console.log('\nPrevious version', version, 'has', slugs.length, 'icons:');
	console.log(slugs.sort());
}

const indexJs = icons
	.map(
		(icon) =>
			`export const si${getExportName(icon.slug)} = ${JSON.stringify(icon)}`,
	)
	.join('\n');
await write(join(buildDestination, 'index.js'), indexJs);
console.log('Write to index.js.');

const indexDts = [
	'export type Icon={title:string;slug:string;hex:string;svg:string}',
	'type I=Icon',
	icons
		.map((icon) => `export const si${getExportName(icon.slug)}:I`)
		.join('\n'),
].join('\n');
await write(join(buildDestination, 'index.d.ts'), indexDts);
console.log('Write to index.d.ts.');
