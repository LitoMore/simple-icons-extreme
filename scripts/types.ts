export type Icon = {
	title: string;
	slug: string;
	hex: string;
	path: string;
};

export type Icons = Record<string, Icon>;

export type IconJson = {
	icons: [{title: string; hex: 'string'; slug?: string}];
};
