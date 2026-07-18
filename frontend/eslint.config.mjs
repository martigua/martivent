// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // --- Angular idioms first (both prefixes in use: `mg-` components, `app-root`) ---
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: ['mg', 'app'], style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['mg', 'app'], style: 'kebab-case' },
      ],
      // Angular signal/DI/decorator member layout has its own conventions; the rule
      // is not auto-fixable, so leaving it on produces permanent, ignored warnings.
      '@typescript-eslint/member-ordering': 'off',
      // Angular components/directives are frequently template-only (empty class body).
      '@typescript-eslint/no-extraneous-class': 'off',

      // --- Google TS style guide, where it does not contradict Angular ---
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase'] },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
        // DTO interfaces mirror the backend wire format (Django sends snake_case JSON).
        { selector: 'typeProperty', format: ['camelCase', 'snake_case'] },
        // Angular lifecycle/DI and template-bound members can be off-convention.
        { selector: 'classProperty', modifiers: ['readonly'], format: null },
        { selector: 'objectLiteralProperty', format: null },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
  // Must be last: disables ESLint rules that would fight Prettier's formatting.
  prettier,
);
