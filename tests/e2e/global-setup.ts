import { execFileSync } from "node:child_process";
import { assertLocalSupabase, root, serviceClient } from "./helpers";

/**
 * Puts the local database in the known demo scenario before the run and resets the
 * rate-limit counters, so the suite gives the same result every time.
 */
export default async function globalSetup() {
  assertLocalSupabase();
  execFileSync("npm", ["run", "db:seed"], { cwd: root, stdio: "inherit" });
  await serviceClient().from("rate_limits").delete().gte("window_start", "1970-01-01");
}
