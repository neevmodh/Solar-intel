/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Auth Middleware
 * ─────────────────────────────────────────────────────────
 * Validates NextAuth session on protected API endpoints.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/backend/utils/api-response";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
}

/**
 * Checks session and returns the authenticated user,
 * or returns an error response if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<
  { user: AuthenticatedUser; error: null } | { user: null; error: ReturnType<typeof apiError> }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return {
      user: null,
      error: apiError("Authentication required. Please sign in.", 401),
    };
  }

  return {
    user: {
      id: (session.user as { id?: string }).id || "",
      name: session.user.name || "",
      email: session.user.email,
      image: session.user.image || undefined,
      role: (session.user as { role?: string }).role || "operator",
    },
    error: null,
  };
}
