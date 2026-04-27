import { requireAuth } from "@/lib/server/guards";
import { normalizeRole, signToken } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/responses";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

type ProfileBody = {
  name?: string;
  email?: string;
};

export async function PUT(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json()) as ProfileBody;
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();

  if (!name || !email) {
    return jsonError("Name and email are required.");
  }

  if (!email.includes("@")) {
    return jsonError("Please enter a valid email address.");
  }

  const supabase = getSupabaseServiceClient();
  const existing = await supabase.auth.admin.getUserById(auth.user.id);
  if (existing.error || !existing.data.user) {
    return jsonError(existing.error?.message ?? "User not found.", 404);
  }

  const currentMetadata = existing.data.user.user_metadata ?? {};
  const nextMetadata = {
    ...currentMetadata,
    fullname: name,
  };

  const updated = await supabase.auth.admin.updateUserById(auth.user.id, {
    email,
    user_metadata: nextMetadata,
  });

  if (updated.error || !updated.data.user) {
    const message = updated.error?.message?.toLowerCase() ?? "";
    if (message.includes("already") && message.includes("registered")) {
      return jsonError("Email is already in use.", 409);
    }

    return jsonError(updated.error?.message ?? "Unable to update profile.", 500);
  }

  const profileUpdate = await supabase
    .from("profiles")
    .update({ email, full_name: name })
    .eq("id", auth.user.id)
    .select("role")
    .maybeSingle();

  if (profileUpdate.error) {
    return jsonError(profileUpdate.error.message ?? "Unable to update profile record.", 500);
  }

  const updatedAuthUser = updated.data.user;
  const publicUser = {
    id: updatedAuthUser.id,
    email: updatedAuthUser.email ?? email,
    name,
    role: normalizeRole(profileUpdate.data?.role ?? updatedAuthUser.user_metadata?.role),
    createdAt: updatedAuthUser.created_at ?? auth.user.createdAt,
  };

  const token = await signToken(publicUser);

  return Response.json(
    { success: true, data: { user: publicUser } },
    {
      status: 200,
      headers: {
        "Set-Cookie": `gym_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`,
      },
    },
  );
}
