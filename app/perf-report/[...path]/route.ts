import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { REPORTS_DIR } from "@/lib/db";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".har": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
};

// Serves the sitespeed.io HTML reports stored under REPORTS_DIR.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const root = resolve(REPORTS_DIR);
  const file = resolve(join(root, ...path));
  if (!file.startsWith(root + sep)) return new Response("Not found", { status: 404 });
  try {
    return new Response(await readFile(file), {
      headers: { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
