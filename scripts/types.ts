export type Icon = {
	title: string;
	slug: string;
	hex: string;
	svg: string;
};

export type Icons = Record<string, Icon>;

export type IconJson = {
	icons: [{title: string; hex: 'string'; slug?: string}];
};
