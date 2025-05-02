import js from '@eslint/js'
import globals from 'globals'

export default [
    { ignores: ['dist'] },
    {
        files: ['**/*.{js,ts}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.node,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
        },
    },
]
