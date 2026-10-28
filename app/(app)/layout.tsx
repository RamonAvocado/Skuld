import { cookies } from "next/headers";
import { requireUser } from "@mimird/auth/auth";
import { AppShell, SIDEBAR_COOKIE } from "@/components/app-shell";
import { listProjects } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";
  // node:sqlite rows have a null prototype — plain-object them before
  // crossing the server→client boundary into the shell.
  const projects = listProjects().map((p) => ({ id: p.id, name: p.name }));

  return (
    <AppShell user={user} projects={projects} defaultCollapsed={collapsed}>
      {children}
    </AppShell>
  );
}
