import { authRedirect } from "@mimird/auth/proxy";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth redirects from the session cookie alone; app/(app)/layout.tsx
 * does the real check. /perf-report is a route handler, so this is its only guard.
 */
export function proxy(request: NextRequest) {
  return authRedirect(request, ["/", "/projects", "/perf-report"]) ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\.svg$).*)"],
};
