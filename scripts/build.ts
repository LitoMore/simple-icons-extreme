import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {type IconData, titleToSlug} from '@simple-icons/13/sdk';
import packageJson from '../package.json';
import type {Icon, IconJson} from './types';
import {
	getExportName,
	normalizeSlug,
	packagePrefix,
	projectRoot,
} from './utils';

const svgGlob = new Bun.Glob('*.svg');
const nodeModulesRoot = join(projectRoot, 'node_modules');
const buildDestination = join(projectRoot, 'distribution');
const svgDestination = join(projectRoot, 'icons');
const isVerbose = Bun.argv.includes('--verbose');

const versions = Object.keys(packageJson.devDependencies).filter((name) =>
	name.startsWith(packagePrefix),
);

versions.sort((a, b) => a.localeCompare(b));

await mkdir(svgDestination, {recursive: true});
for (const [index, version] of versions.entries()) {
	await Bun.$`cp *.svg '${svgDestination}'`.cwd(
		join(nodeModulesRoot, version, 'icons'),
	);
	console.log('Copy verseion', index + 1, 'to icons.');
}

const allSlugs = [...svgGlob.scanSync(svgDestination)].map((x) =>
	x.replace(/\.svg$/, ''),
);
const allSlugsSet = new Set(allSlugs);
const invalidSlugs = allSlugs.filter((slug) => slug.includes('-'));
const $ = Bun.$.cwd(svgDestination);
for (const slug of invalidSlugs) {
	const normalizedSlug = normalizeSlug(slug);
	await (allSlugsSet.has(normalizedSlug)
		? $`rm '${slug}.svg'`.cwd(svgDestination)
		: $`mv '${slug}.svg' '${normalizedSlug}.svg'`.cwd(svgDestination));
}

const slugs = new Set(allSlugs.map((x) => normalizeSlug(x)));
const icons: Icon[] = [];
const previousIcons: Record<string, string[]> = {};

for (const slug of slugs) {
	const svgFile = await Bun.file(join(svgDestination, `${slug}.svg`)).text();

	for (const [index, version] of versions.slice().reverse().entries()) {
		const dataJsonPath = join(
			nodeModulesRoot,
			version,
			'_data',
			'simple-icons.json',
		);

		const versionNumber = Number(version.split('/').at(-1));
		const isNewFormat = versionNumber >= 14;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const dataJson = await import(dataJsonPath);
		const dataIcons = isNewFormat
			? (dataJson.default as IconData[])
			: (dataJson.icons as IconData[]);
		const foundIcon = dataIcons.find((icon) => {
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

			if (isVerbose && index > 0) {
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

if (isVerbose) {
	console.log('Found', icons.length, 'icons.');
	console.log('\nPrevious icons summary:');
	for (const [version, slugs] of Object.entries(previousIcons)) {
		console.log('\nPrevious version', version, 'has', slugs.length, 'icons:');
		console.log(slugs.sort());
	}
}

const indexJs = icons
	.map(
		(icon) =>
			`export const si${getExportName(icon.slug)} = ${JSON.stringify(icon)}`,
	)
	.join('\n');
await Bun.write(join(buildDestination, 'index.js'), indexJs);
console.log('Write to index.js.');

const indexDts = [
	'export type Icon={title:string;slug:string;hex:string;svg:string}',
	'type I=Icon',
	icons
		.map((icon) => `export const si${getExportName(icon.slug)}:I`)
		.join('\n'),
].join('\n');
await Bun.write(join(buildDestination, 'index.d.ts'), indexDts);
console.log('Write to index.d.ts.');
