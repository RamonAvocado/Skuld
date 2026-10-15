import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { listProjects } from "@/lib/db";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skuld — test inventory",
  description: "Run tests, track coverage over time, plan the tests.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // node:sqlite rows have a null prototype — plain-object them before
  // crossing the server→client boundary into Sidebar.
  const projects = listProjects().map((p) => ({ id: p.id, name: p.name }));

  return (
    <html
      lang="en"
      className={`${sans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a
            href="#main"
            className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-background focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            Skip to content
          </a>
          <Sidebar projects={projects} />
          <main id="main" className="min-w-0 flex-1 overflow-y-auto p-8">
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
