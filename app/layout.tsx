import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skuld — test inventory",
  description: "Run tests, track coverage over time, plan the roadmap.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a
            href="#main"
            className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-background focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            Skip to content
          </a>
          <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 items-baseline gap-3">
                <Link href="/" className="shrink-0 text-base font-semibold tracking-tight hover:opacity-80">
                  Skuld
                </Link>
              </div>
              <ModeToggle />
            </div>
          </header>
          <main id="main" className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
