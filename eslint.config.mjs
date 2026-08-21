import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated and vendored trees. Agent worktrees under .claude carry their
    // own copy of the app plus a nested .next, so a plain `pnpm lint` used to
    // report thousands of problems from code that is not this checkout.
    ".claude/**",
    "**/.next/**",
    "**/node_modules/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
