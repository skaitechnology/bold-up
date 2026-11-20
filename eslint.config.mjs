import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Coach and venue photos come from Supabase Storage and are resized on upload.
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: [".next/**", ".next-e2e/**", "node_modules/**", "playwright-report/**", "test-results/**", "next-env.d.ts"],
  },
];

export default config;
