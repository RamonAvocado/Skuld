"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const STORAGE_KEY = "skuld-sidebar-collapsed";
const BUTTON =
  "flex size-7 shrink-0 items-center justify-center rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
// text that disappears when the sidebar is collapsed to its icon rail
const LABEL = "truncate group-data-[collapsed=true]/sidebar:hidden";

// The black-ring mark sits on light surfaces, the white-ring one on dark.
function Logo({ className }: { className?: string }) {
  return (
    <>
      <img src="/brand/mimird-icon-black.svg" alt="" className={cn("size-6 dark:hidden", className)} />
      <img src="/brand/mimird-icon-white.svg" alt="" className={cn("hidden size-6 dark:block", className)} />
    </>
  );
}

function NavLink({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  // a project stays lit on its sub-pages (settings)
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&_svg]:size-4 [&_svg]:shrink-0",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-brand [&>span:first-child]:text-brand"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export function Sidebar({ projects }: { projects: { id: number; name: string }[] }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on mount
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  return (
    <aside
      data-collapsed={collapsed}
      className="group/sidebar sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none data-[collapsed=true]:w-14"
    >
      <div className="flex h-16 shrink-0 items-center px-4 group-data-[collapsed=true]/sidebar:justify-center">
        {collapsed ? (
          // the logo is the expand button: hovering or focusing it swaps in the panel icon
          <button
            onClick={toggle}
            aria-expanded={false}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className={`group/logo relative ${BUTTON}`}
          >
            <span className="absolute transition-opacity group-hover/logo:opacity-0 group-focus-visible/logo:opacity-0">
              <Logo />
            </span>
            <PanelLeftOpen className="size-4 opacity-0 transition-opacity group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100" aria-hidden />
          </button>
        ) : (
          <div className="flex flex-1 items-center justify-between gap-2">
            <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <Logo />
              <span className="text-[15px] font-semibold tracking-tight" translate="no">
                Skuld
              </span>
            </Link>
            <button
              onClick={toggle}
              aria-expanded
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className={`text-muted-foreground transition-colors hover:text-foreground ${BUTTON}`}
            >
              <PanelLeftClose className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto px-2 pb-4" aria-label="Projects">
        <NavLink href="/" title="All Projects">
          <Boxes aria-hidden />
          <span className={LABEL}>All Projects</span>
        </NavLink>
        {projects.length > 0 && (
          // ponytail: native <details>, open state is not remembered across reloads
          <details open className="group/section mt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none group-data-[collapsed=true]/sidebar:hidden [&::-webkit-details-marker]:hidden">
              Projects
              <ChevronDown className="size-3.5 -rotate-90 transition-transform group-open/section:rotate-0" aria-hidden />
            </summary>
            <div className="flex flex-col gap-1">
              {projects.map((p) => (
                <NavLink key={p.id} href={`/projects/${p.id}`} title={p.name}>
                  <span className="flex size-4 shrink-0 items-center justify-center text-xs uppercase" aria-hidden>
                    {p.name[0]}
                  </span>
                  <span className={LABEL}>{p.name}</span>
                </NavLink>
              ))}
            </div>
          </details>
        )}
      </nav>

      <ThemeToggle collapsed={collapsed} />
    </aside>
  );
}
