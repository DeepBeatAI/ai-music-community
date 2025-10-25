import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Ignore generated and problematic files
    ignores: [
      "src/types/database.ts",
      "src/types/supabase.ts",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "**/*.log",
    ],
  },
  {
    // Relax rules for test files
    files: ["**/__tests__/**/*", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    // Downgrade blocking rules to warnings for production code
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow 'any' for legitimate use cases (backward compatibility, dynamic data)
      // Use eslint-disable comments for specific lines if autofix is too aggressive
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
  {
    // Allow 'any' in specific contexts where it's necessary
    files: ["**/contexts/**/*.tsx", "**/contexts/**/*.ts"],
    rules: {
      // Context files often need 'any' for flexibility with dynamic data
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
