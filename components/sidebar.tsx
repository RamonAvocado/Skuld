"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Hourglass, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const STORAGE_KEY = "skuld-sidebar-collapsed";

const itemCls =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors";
const activeCls = "bg-sidebar-accent text-sidebar-accent-foreground";
const inactiveCls =
  "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

export function Sidebar({ projects }: { projects: { id: number; name: string }[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
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
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-16 shrink-0 items-center px-4">
        {collapsed ? (
          <button
            onClick={toggle}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="group relative mx-auto flex size-6 shrink-0 items-center justify-center"
          >
            <Hourglass className="absolute size-6 transition-opacity group-hover:opacity-0" />
            <PanelLeftOpen className="size-5 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ) : (
          <div className="flex flex-1 items-center justify-between gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Hourglass className="size-6 shrink-0" />
              <span className="font-heading text-base font-semibold">Skuld</span>
            </Link>
            <button
              onClick={toggle}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="flex size-6 shrink-0 items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2">
        <Link
          href="/"
          title={collapsed ? "Projects" : undefined}
          className={cn(itemCls, pathname === "/" ? activeCls : inactiveCls)}
        >
          <FolderKanban className="size-4 shrink-0" />
          {!collapsed && <span>Projects</span>}
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            title={p.name}
            className={cn(itemCls, pathname === `/projects/${p.id}` ? activeCls : inactiveCls)}
          >
            <span className="flex size-4 shrink-0 items-center justify-center text-xs uppercase">
              {p.name[0]}
            </span>
            {!collapsed && <span className="truncate">{p.name}</span>}
          </Link>
        ))}
      </nav>

      <ThemeToggle collapsed={collapsed} />
    </aside>
  );
}
