import type { NextConfig } from "next";

// Browsers keep cookies per host, not per port, so every app on localhost (Mimird-Web
// :3000, home :8000, Skuld :3003) shares one jar. With @mimird/auth's default prefix
// they'd all read and overwrite the same `mimird_session`, and since they also share the
// dev fallback secret, Skuld would accept another app's sign-in. Our own prefix keeps
// Skuld's session apart. Set here so dev, `next start`, Docker and proxy.ts all see it.
process.env.AUTH_COOKIE_PREFIX ||= "skuld";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
