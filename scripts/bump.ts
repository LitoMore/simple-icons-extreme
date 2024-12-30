import path from 'node:path';
import packageJson from '../package.json';
import {packagePrefix, projectRoot} from './utils';

const fetchLatestVersion = async () => {
	const url = 'https://data.jsdelivr.com/v1/packages/npm/simple-icons';
	const response = await fetch(url);
	const data = (await response.json()) as {tags: {latest: string}};
	return data.tags.latest;
};

const latestVersion = await fetchLatestVersion();
const latestMajorVersion = latestVersion.split('.')[0];

const versions = Array.from({
	length: Number.parseInt(latestMajorVersion, 10),
}).map((_, index) => `${index + 1}`);

const maxLength = Math.max(...versions.map((v) => v.length));
const currentDependencies = packageJson.devDependencies;
const iconDependencies = {
	...Object.fromEntries(
		versions.map((v) => [
			packagePrefix + v.padStart(maxLength, '0'),
			'npm:simple-icons@^' + v,
		]),
	),
	[packagePrefix + 'latest']: `npm:simple-icons@^${latestMajorVersion}`,
};
const newDependencies = {...currentDependencies, ...iconDependencies};
const newSortedDependencies = Object.fromEntries(
	Object.entries(newDependencies).sort(([a], [b]) => a.localeCompare(b)),
);

await Bun.write(
	path.join(projectRoot, 'package.json'),
	JSON.stringify(
		{...packageJson, devDependencies: newSortedDependencies},
		null,
		'\t',
	) + '\n',
);

const $ = Bun.$.cwd(projectRoot);
await $`bun update`;
await $`bun install`;
