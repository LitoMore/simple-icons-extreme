import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';

export const projectRoot = path.join(import.meta.dirname, '..');

export const packagePrefix = '@simple-icons/';

export const normalizeSlug = (slug: string) => slug.replaceAll('-', '');

export const getExportName = (slug: string) =>
	(slug.at(0) ?? '').toUpperCase() + slug.slice(1);

export const renderProgress = (total: number, current: number) => {
	if (!process.stdout.isTTY) return;

	readline.cursorTo(process.stdout, 0);
	readline.clearLine(process.stdout, 0);
	const left = total - current;
	const progress = ((current / total) * 100).toFixed(2);
	if (left > 1) {
		process.stdout.write(`Progress: ${progress}%`);
	}
};

export const titleToHtmlFriendly = (brandTitle: string) =>
	brandTitle
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll(/./g, (char) => {
			const charCode = char.codePointAt(0) ?? 0;
			return charCode > 127 ? `&#${charCode};` : char;
		});
