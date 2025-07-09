// @ts-check
import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import neverthrow from 'eslint-plugin-neverthrow';
import parser from '@typescript-eslint/parser';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    languageOptions: { globals: globals.node, parser: parser },
    plugins: { neverthrow },
    rules: {
      'neverthrow/must-use-result': 'error',
    },
  },
);
