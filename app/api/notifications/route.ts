import { requireAuth } from "@/lib/server/guards";
import { mapNotificationRow, type NotificationRow } from "@/lib/server/data-helpers";
import { jsonError, jsonSuccess } from "@/lib/server/responses";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getSupabaseServiceClient();
  const response = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (response.error) {
    return jsonError(response.error.message || "Unable to load notifications.", 500);
  }

  const notifications = (response.data ?? []).map((row) =>
    mapNotificationRow(row as NotificationRow),
  );

  return jsonSuccess({ notifications });
}
