import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Esta lista reemplaza los ignorados por defecto de eslint-config-next, que se repiten aquí.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generado desde el OpenAPI del backend con `npm run tipos:generar`.
    'src/api/openapi.d.ts',
  ]),
]);
