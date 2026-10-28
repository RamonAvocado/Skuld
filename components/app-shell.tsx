"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoxesIcon, FolderIcon, PaletteIcon, PanelLeftIcon, SettingsIcon, UserRoundIcon } from "lucide-react";
import type { User } from "@mimird/auth/types";
import { AppearanceSection } from "@mimird/auth/account/appearance-section";
import { ProfileSection } from "@mimird/auth/account/profile-section";
import { SettingsDialog, type SettingsSection } from "@mimird/auth/account/settings-dialog";
import { setHash } from "@mimird/auth/account/use-hash";
import { UserMenu } from "@mimird/auth/account/user-menu";
import { Button } from "@mimird/ui/components/button";
import { DropdownMenuItem } from "@mimird/ui/components/dropdown-menu";
import { Separator } from "@mimird/ui/components/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@mimird/ui/components/sheet";
import { Sidebar, SidebarItem } from "@mimird/ui/components/sidebar";
import { cn } from "@/lib/utils";

export const SIDEBAR_COOKIE = "skuld_sidebar";

// The black-ring mark sits on light surfaces, the white-ring one on dark.
function Mark({ className }: { className?: string }) {
  return (
    <>
      <img src="/brand/mimird-icon-black.svg" alt="" className={cn("size-7 dark:hidden", className)} />
      <img src="/brand/mimird-icon-white.svg" alt="" className={cn("hidden size-7 dark:block", className)} />
    </>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <Mark />
      <span className="text-[15px] font-semibold tracking-tight" translate="no">
        Skuld
      </span>
    </Link>
  );
}

function Nav({ projects, onNavigate }: { projects: { id: number; name: string }[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  // a project stays lit on its sub-pages
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <>
      <SidebarItem render={<Link href="/" onClick={onNavigate} />} icon={BoxesIcon} label="All Projects" active={active("/")} />
      {/* the same hairline as the one above the user menu */}
      {projects.length > 0 && <Separator className="my-2 bg-border/70" />}
      {projects.map((p) => (
        <SidebarItem
          key={p.id}
          render={<Link href={`/projects/${p.id}`} onClick={onNavigate} />}
          icon={FolderIcon}
          label={p.name}
          active={active(`/projects/${p.id}`)}
        />
      ))}
    </>
  );
}

function Account({ user, collapsed }: { user: User; collapsed?: boolean }) {
  return (
    <UserMenu user={user} collapsed={collapsed}>
      <DropdownMenuItem onClick={() => setHash("account/profile")}>
        <UserRoundIcon aria-hidden />
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setHash("account/appearance")}>
        <SettingsIcon aria-hidden />
        Settings
      </DropdownMenuItem>
    </UserMenu>
  );
}

export function AppShell({
  user,
  projects,
  defaultCollapsed = false,
  children,
}: {
  user: User;
  projects: { id: number; name: string }[];
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  function toggleCollapsed(next: boolean) {
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"};path=/;max-age=31536000;samesite=lax`;
  }

  // The account dialog lives on #account/…; #settings/… belongs to a project's settings.
  const sections: SettingsSection[] = [
    { value: "account/profile", label: "Profile", icon: UserRoundIcon, content: <ProfileSection user={user} /> },
    { value: "account/appearance", label: "Appearance", icon: PaletteIcon, content: <AppearanceSection /> },
  ];

  return (
    <div className="flex min-h-svh flex-1">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={toggleCollapsed}
        title={<Logo />}
        mark={<Mark />}
        label="Projects"
        footer={<Account user={user} collapsed={collapsed} />}
      >
        <Nav projects={projects} />
      </Sidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile only: desktop navigates from the sidebar. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Open navigation" />}>
              <PanelLeftIcon aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="flex h-full flex-col gap-4 p-3">
                <div className="flex h-10 items-center">
                  <Logo />
                </div>
                <nav aria-label="Projects" className="flex min-h-0 flex-col gap-1 overflow-y-auto">
                  <Nav projects={projects} onNavigate={() => setMobileOpen(false)} />
                </nav>
                <div className="mt-auto border-t border-border/70 pt-3">
                  <Account user={user} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Logo />
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <SettingsDialog sections={sections} title="Account" />
    </div>
  );
}
