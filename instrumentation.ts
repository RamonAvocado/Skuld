/**
 * Runs once before the server takes requests: @mimird/auth keeps its users in
 * Skuld's own SQLite file (the `kv` table in lib/db.ts). Without `sendEmail`,
 * dev prints the sign-up and reset codes to the server log.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { configureAuth } = await import("@mimird/auth/setup");
    const { kvStore } = await import("@mimird/auth/store-adapter");
    const { identicon } = await import("@mimird/auth/identicon");
    const { kvDel, kvGet, kvSet } = await import("./lib/db");

    configureAuth({ store: kvStore({ get: kvGet, set: kvSet, del: kvDel }), identicon });
  }
}
