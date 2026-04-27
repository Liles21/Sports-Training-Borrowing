import { requireAuth } from "@/lib/server/guards";
import { jsonError, jsonSuccess } from "@/lib/server/responses";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/notifications/[id]">,
): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  const supabase = getSupabaseServiceClient();
  const response = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (response.error) {
    return jsonError(response.error.message || "Unable to update notification.", 500);
  }

  if (!response.data) {
    return jsonError("Notification not found.", 404);
  }

  return jsonSuccess({ message: "Notification updated." });
}
