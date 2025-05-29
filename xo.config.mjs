import {importX} from 'eslint-plugin-import-x';

const xoConfig = [
	{
		prettier: true,
		plugins: [{'import-x': importX}],
		ignores: ['distribution'],
		rules: {
			'no-await-in-loop': 'off',
			'n/file-extension-in-import': 'off',
			'sort-imports': [
				'error',
				{
					ignoreCase: false,
					ignoreDeclarationSort: true,
					ignoreMemberSort: false,
					memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
					allowSeparatedGroups: false,
				},
			],
			'import-x/no-named-as-default': 'off',
			'import-x/extensions': 'off',
			'import-x/order': [
				'error',
				{
					groups: ['builtin', 'external', 'parent', 'sibling', 'index'],
					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
					warnOnUnassignedImports: true,
					'newlines-between': 'never',
				},
			],
		},
	},
];

export default xoConfig;
