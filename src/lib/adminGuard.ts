import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { unauthorized, forbidden } from "next/navigation";

/**
 * Server-side guard for admin pages.
 * Reads the session cookie, verifies authentication and admin role.
 * Throws unauthorized() for unauthenticated users (401).
 * Throws forbidden() for authenticated non-admin users (403).
 *
 * Must be called from a Server Component (page.tsx).
 */
export async function adminGuard(): Promise<void> {
  // Read session cookie to pass to Better Auth
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Build a minimal headers object with cookies for Better Auth
  const cookieHeader = allCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  });

  if (!session?.user?.id) {
    unauthorized();
  }

  const account = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { role: true },
  });

  if (account?.role !== "admin") {
    forbidden();
  }
}
