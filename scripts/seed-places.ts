/**
 * Seeds only the V2 demo content: sports clubs, street workout spots and events.
 * Safe to run on its own and as often as needed: it replaces its own rows and nothing else
 * (accounts, coaches, bookings and gyms are left alone).
 *
 *   npm run db:seed:places
 *   ENV_FILE=.env.production.local npm run db:seed:places -- --allow-remote
 */
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import type { Database } from "../src/lib/database.types";
import { seedPlacesAndEvents } from "./lib/demo-places";

const root = path.resolve(__dirname, "..");
loadEnv({ path: path.join(root, process.env.ENV_FILE ?? ".env.local"), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See .env.example.");
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(url) && !process.argv.includes("--allow-remote")) {
  console.error(`Refusing to seed a remote project (${new URL(url).host}) without --allow-remote.`);
  process.exit(1);
}

const db = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

seedPlacesAndEvents(db)
  .then((count) => console.log(`Seeded ${count.clubs} clubs, ${count.spots} street workout spots and ${count.events} events on ${new URL(url).host}.`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
