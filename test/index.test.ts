import {join} from 'node:path';
import {collator} from '@simple-icons/latest/sdk';
import {expect, test} from 'bun:test';
import * as icons from 'simple-icons-extreme';
import iconsJson from 'simple-icons-extreme/icons.json';

const iconsDirectory = join(import.meta.dirname, '..', 'icons');
const svgGlob = new Bun.Glob('*.svg');
const slugsArray = [...svgGlob.scanSync(iconsDirectory)]
	.map((x) => x.replace(/\.svg$/, ''))
	.sort(collator.compare);
const slugsSet = new Set(slugsArray);
const allIcons = Object.entries(icons);

test('JSON content has the same count as SVG slugs', () => {
	expect(allIcons.length).toBe(slugsSet.size);
	expect(
		allIcons
			.map(([key]) => key.slice(2).toLowerCase())
			.every((slug) => slugsSet.has(slug)),
	).toBe(true);
	expect(
		iconsJson.map((icon) => icon.slug).every((slug) => slugsSet.has(slug)),
	).toBe(true);
});

test('All path are valid', () => {
	expect(allIcons.every(([, icon]) => icon.path.length > 0)).toBe(true);
});

test('All icons are in JSON with correct order', () => {
	expect(iconsJson.length).toBe(slugsSet.size);
	expect(iconsJson.map((icon) => icon.slug)).toEqual([...slugsArray]);
});
