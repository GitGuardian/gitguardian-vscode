import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier/recommended";

export default defineConfig([
  { ignores: ["out/**", "dist/**", "**/*.d.ts"] },
  {
    files: ["src/**/*.ts"],
    extends: [...tseslint.configs.recommendedTypeChecked, prettierPlugin],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.src.json", "./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/only-throw-error": "error",
      eqeqeq: ["error", "smart"],
      curly: ["error", "all"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
]);
