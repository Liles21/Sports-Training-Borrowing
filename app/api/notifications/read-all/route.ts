import { requireAuth } from "@/lib/server/guards";
import { jsonError, jsonSuccess } from "@/lib/server/responses";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

export async function PATCH(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getSupabaseServiceClient();
  const response = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", auth.user.id)
    .eq("read", false);

  if (response.error) {
    return jsonError(response.error.message || "Unable to update notifications.", 500);
  }

  return jsonSuccess({ message: "Notifications marked as read." });
}
