import { requireAuth } from "@/lib/server/guards";
import { jsonError, jsonSuccess } from "@/lib/server/responses";
import { getSupabaseAnonClient, getSupabaseServiceClient } from "@/lib/server/supabase";

type PasswordBody = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export async function PUT(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json()) as PasswordBody;
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";
  const confirmPassword = body.confirmPassword ?? "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return jsonError("All password fields are required.");
  }

  if (newPassword.length < 6) {
    return jsonError("New password must be at least 6 characters.");
  }

  if (newPassword !== confirmPassword) {
    return jsonError("New password and confirmation do not match.");
  }

  const anonSupabase = getSupabaseAnonClient();
  const verifyCurrent = await anonSupabase.auth.signInWithPassword({
    email: auth.user.email,
    password: currentPassword,
  });

  if (verifyCurrent.error) {
    return jsonError("Current password is incorrect.", 401);
  }

  const adminSupabase = getSupabaseServiceClient();
  const updated = await adminSupabase.auth.admin.updateUserById(auth.user.id, {
    password: newPassword,
  });

  if (updated.error) {
    return jsonError(updated.error.message || "Unable to update password.", 500);
  }

  return jsonSuccess({ message: "Password updated successfully." });
}
