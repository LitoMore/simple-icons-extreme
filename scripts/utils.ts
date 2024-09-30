import path from 'node:path';

export const projectRoot = path.join(import.meta.dirname, '..');

export const packagePrefix = '@simple-icons/';

export const normalizeSlug = (slug: string) => slug.replaceAll('-', '');

export const getExportName = (slug: string) =>
	(slug.at(0) ?? '').toUpperCase() + slug.slice(1);
