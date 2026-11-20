/**
 * Applies supabase/migrations to a hosted Supabase project.
 *
 *   ENV_FILE=.env.production.local npm run db:push
 *
 * Reads the direct (non-pooled) Postgres URL from the env file and hands it to the
 * Supabase CLI, which keeps track of what has already been applied. For the local stack,
 * use `npm run db:reset` instead.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const root = path.resolve(__dirname, "..");
const envFile = process.env.ENV_FILE ?? ".env.local";
loadEnv({ path: path.join(root, envFile), quiet: true });

const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
if (!url) {
  console.error(`No POSTGRES_URL_NON_POOLING in ${envFile}. Pull it with: vercel env pull ${envFile} --environment=production`);
  process.exit(1);
}
const host = new URL(url).host;
console.log(`Applying migrations to ${host}…`);

// The connection string carries a password: pass it through the environment-free argv of
// a child process and never print it.
const result = spawnSync("npx", ["supabase", "db", "push", "--db-url", url, "--include-all"], { cwd: root, stdio: "inherit" });
process.exit(result.status ?? 1);
