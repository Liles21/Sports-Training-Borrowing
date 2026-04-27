import { getTokenFromRequest, verifyToken } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/responses";
import type { PublicUser, UserRole } from "@/lib/types";

export async function getCurrentUser(request: Request): Promise<PublicUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyToken(token);
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      createdAt: payload.createdAt,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(request: Request): Promise<
  | {
      ok: true;
      user: PublicUser;
    }
  | {
      ok: false;
      response: Response;
    }
> {
  const user = await getCurrentUser(request);
  if (!user) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }

  return { ok: true, user };
}

export function requireRole(user: PublicUser, allowedRoles: UserRole[]): Response | null {
  if (!allowedRoles.includes(user.role)) {
    return jsonError("Forbidden", 403);
  }

  return null;
}
