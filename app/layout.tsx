import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Skuld — test inventory",
  description: "Run tests, track coverage over time, plan the roadmap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
            <Link href="/" className="font-semibold">
              Skuld
            </Link>
            <span className="text-sm text-muted-foreground">test inventory & coverage evolution</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
