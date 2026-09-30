import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Private/signed media URLs are rendered without the Next image optimizer.
      "@next/next/no-img-element": "off",
      // This project keeps the existing effect-driven resource hook (no React Compiler).
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  globalIgnores([".next/**", "next-env.d.ts", "audit/**"]),
]);
