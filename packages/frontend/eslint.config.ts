import path from "node:path";
import {fileURLToPath} from "node:url";
import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import {defineConfig} from "eslint/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    }
  }
]);
