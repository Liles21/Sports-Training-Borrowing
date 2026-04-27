import { requireAuth } from "@/lib/server/guards";
import { jsonSuccess } from "@/lib/server/responses";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const user = {
    id: auth.user.id,
    email: auth.user.email,
    name: auth.user.name,
    role: auth.user.role,
    createdAt: auth.user.createdAt,
  };
  return jsonSuccess({ user });
}
