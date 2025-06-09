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
    ignores: [
      // Fichiers générés automatiquement par next-pwa
      "public/sw.js",
      "public/workbox-*.js",
      // Dossiers de build
      ".next/**/*",
      "out/**/*",
      "dist/**/*",
      // Fichiers de dépendances
      "node_modules/**/*",
    ],
  },
];

export default eslintConfig;
