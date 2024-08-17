export const normalizeSlug = (slug: string) => slug.replaceAll('-', '');

export const getExportName = (slug: string) =>
	(slug.at(0) ?? '').toUpperCase() + slug.slice(1);
