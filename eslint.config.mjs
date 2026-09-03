import { defineConfig, globalIgnores } from "eslint/config";
import next from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

// eslint-config-next n'est pas utilisé : il embarque une version
// d'eslint-plugin-react incompatible avec ESLint 10 (context.getFilename
// a été supprimé). Le plugin Next est donc branché directement.
const eslintConfig = defineConfig([
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
    },
  },
]);

export default eslintConfig;
