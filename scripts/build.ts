import fs from 'node:fs/promises';
import path from 'node:path';
import * as siExtreme from '@simple-icons/extreme';
import type {IconData} from '@simple-icons/latest/icons.json';
import {collator, getIconSlug, svgToPath} from '@simple-icons/latest/sdk';
import packageJson from '../package.json';
import {type Icon} from './types';
import {
	getExportName,
	normalizeSlug,
	packagePrefix,
	projectRoot,
	renderProgress,
	titleToHtmlFriendly,
} from './utils';

const svgGlob = new Bun.Glob('*.svg');
const nodeModulesRoot = path.join(projectRoot, 'node_modules');
const buildDestination = path.join(projectRoot, 'distribution');
const svgDestination = path.join(projectRoot, 'icons');
const isFullBuild = Bun.argv.includes('--full-build');
const isVerbose = Bun.argv.includes('--verbose');

const siExtremePackageName = packagePrefix + 'extreme';
const siLatestPackageName = packagePrefix + 'latest';

const versions = isFullBuild
	? Object.keys(packageJson.devDependencies).filter(
			(name) =>
				name.startsWith(packagePrefix) &&
				!name.endsWith('latest') &&
				!name.endsWith('extreme'),
		)
	: [siExtremePackageName, siLatestPackageName];

if (isFullBuild) {
	versions.sort((a, b) => a.localeCompare(b));
}

await fs.mkdir(svgDestination, {recursive: true});

for (const [index, version] of versions.toReversed().entries()) {
	try {
		await Bun.$`cp -n *.svg '${svgDestination}'`.cwd(
			path.join(nodeModulesRoot, version, 'icons'),
		);
	} catch {}

	console.log('Copied version', isFullBuild ? index + 1 : version, 'to icons.');
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

const slugs = new Set(
	allSlugs.map((x) => normalizeSlug(x)).sort(collator.compare),
);
const icons: Icon[] = [];
const previousIcons: Record<string, string[]> = {};

let currentCount = 0;
for (const slug of slugs) {
	renderProgress(slugs.size, icons.length);
	currentCount++;
	const svgFile = await Bun.file(
		path.join(svgDestination, `${slug}.svg`),
	).text();
	const svgPath = svgToPath(svgFile);

	for (const [index, version] of versions.toReversed().entries()) {
		const packageJsonPath = path.join(nodeModulesRoot, version, 'package.json');
		const packageJson = JSON.parse(await Bun.file(packageJsonPath).text()) as {
			version: string;
		};
		const [major] = packageJson.version.split('.');

		const dataJsonPath = path.join(
			nodeModulesRoot,
			version,
			...(version === siExtremePackageName
				? ['distribution', 'icons.json']
				: [Number(major) >= 15 ? 'data' : '_data', 'simple-icons.json']),
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, promise/prefer-await-to-then
		const dataJson = await import(dataJsonPath).catch(() => {
			if (version === siExtremePackageName) {
				return Object.values(siExtreme).map((icon) => ({
					title: icon.title,
					slug: icon.slug,
					hex: icon.hex,
				}));
			}
		});
		const dataIcons = (dataJson.icons ??
			dataJson.default ??
			dataJson) as IconData[];
		const foundIcon = dataIcons.find((icon) => {
			const iconSlug = getIconSlug(icon);
			return iconSlug === slug;
		});
		if (foundIcon) {
			icons.push({
				title: foundIcon.title,
				slug,
				hex: foundIcon.hex,
				path: svgPath,
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

const indexJs = [
	`const a='<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>',b='</title><path d="',c='"/></svg>'`,
	...icons.map((icon) => {
		const friendlyTitle = titleToHtmlFriendly(icon.title);
		const hasSpecialChars = friendlyTitle !== icon.title;
		return `export const si${getExportName(icon.slug)}={"title":"${icon.title}","slug":"${icon.slug}","hex":"${icon.hex}","path":"${icon.path}",get svg(){return a+${hasSpecialChars ? `"${friendlyTitle}"` : 'this.title'}+b+this.path+c}}`;
	}),
].join('\n');
await Bun.write(path.join(buildDestination, 'index.js'), indexJs);
console.log('Write to index.js...');

const indexDts = [
	'export type Icon={title:string;slug:string;hex:string;path:string;svg:string}',
	'type I=Icon',
	icons
		.map((icon) => `export const si${getExportName(icon.slug)}:I`)
		.join('\n'),
].join('\n');
await Bun.write(path.join(buildDestination, 'index.d.ts'), indexDts);
console.log('Write to index.d.ts...');

const iconsJson = JSON.stringify(
	icons.map((icon) => ({title: icon.title, slug: icon.slug, hex: icon.hex})),
);
await Bun.write(path.join(buildDestination, 'icons.json'), iconsJson);
console.log('write to icons.json...');

const iconsJsonDts = `declare type Icon = {title: string; slug: string; hex: string};
declare const icons: Icon[];
export default icons;
export = icons;
`;
await Bun.write(path.join(buildDestination, 'icons.d.ts'), iconsJsonDts);
console.log('Write to icons.d.ts...');

console.log('Done.');
