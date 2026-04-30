import {
  computeAvailableForEquipment,
  isOverdue,
  mapBorrowRequestRow,
  mapEquipmentRow,
  type BorrowRequestRow,
  type EquipmentRow,
} from "@/lib/server/data-helpers";
import { requireAuth, requireRole } from "@/lib/server/guards";
import { jsonError, jsonSuccess } from "@/lib/server/responses";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

type UpdateBody = {
  action?: "approve" | "reject" | "return" | "accept_return";
  condition?: string;
};

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/borrow-requests/[id]">,
): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json()) as UpdateBody;
  const action = body.action;

  if (!action || !["approve", "reject", "return", "accept_return"].includes(action)) {
    return jsonError("Invalid action.");
  }

  const supabase = getSupabaseServiceClient();
  const requestResponse = await supabase
    .from("borrow_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (requestResponse.error) {
    return jsonError(requestResponse.error.message || "Unable to load borrow request.", 500);
  }

  if (!requestResponse.data) {
    return jsonError("Borrow request not found.", 404);
  }

  const target = mapBorrowRequestRow(requestResponse.data as BorrowRequestRow);

  // Authorization check
  if (action === "return") {
    // Borrower can return their own request, Admin can return any
    if (auth.user.id !== target.userId && auth.user.role !== "admin") {
      return jsonError("Not authorized to return this equipment.", 403);
    }
  } else {
    // Other actions (approve, reject, accept_return) require admin role
    const roleResponse = requireRole(auth.user, ["admin"]);
    if (roleResponse) {
      return roleResponse;
    }
  }

  const equipmentResponse = await supabase
    .from("equipment")
    .select("*")
    .eq("id", target.equipmentId)
    .maybeSingle();

  if (equipmentResponse.error) {
    return jsonError(equipmentResponse.error.message || "Unable to load equipment.", 500);
  }

  if (!equipmentResponse.data) {
    return jsonError("Equipment not found.", 404);
  }

  const item = mapEquipmentRow(equipmentResponse.data as EquipmentRow);

  if (action === "approve") {
    if (target.status !== "pending") {
      return jsonError("Action not allowed for current status.");
    }

    const approvedResponse = await supabase
      .from("borrow_requests")
      .select("*")
      .eq("equipment_id", target.equipmentId)
      .eq("status", "approved");

    if (approvedResponse.error) {
      return jsonError(approvedResponse.error.message || "Unable to validate availability.", 500);
    }

    const available = computeAvailableForEquipment(
      item,
      (approvedResponse.data ?? []).map((row) => mapBorrowRequestRow(row as BorrowRequestRow)),
    );

    if (target.quantity > available) {
      return jsonError("Cannot approve because stock is no longer available.");
    }

    const updateResponse = await supabase
      .from("borrow_requests")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", id);

    if (updateResponse.error) {
      return jsonError(updateResponse.error.message || "Unable to update borrow request.", 500);
    }

    const notifyResponse = await supabase.from("notifications").insert({
      user_id: target.userId,
      message: `Your request for ${item.name} was approved.`,
      type: "success",
      read: false,
    });

    if (notifyResponse.error) {
      return jsonError(notifyResponse.error.message || "Unable to create notification.", 500);
    }
  } else if (action === "reject") {
    if (target.status !== "pending") {
      return jsonError("Action not allowed for current status.");
    }

    const updateResponse = await supabase
      .from("borrow_requests")
      .update({ status: "rejected" })
      .eq("id", id);

    if (updateResponse.error) {
      return jsonError(updateResponse.error.message || "Unable to update borrow request.", 500);
    }

    const notifyResponse = await supabase.from("notifications").insert({
      user_id: target.userId,
      message: `Your request for ${item.name} was rejected.`,
      type: "error",
      read: false,
    });

    if (notifyResponse.error) {
      return jsonError(notifyResponse.error.message || "Unable to create notification.", 500);
    }
  } else if (action === "return") {
    if (target.status !== "approved") {
      return jsonError("Action not allowed for current status.");
    }

    const updateResponse = await supabase
      .from("borrow_requests")
      .update({ status: "returning" })
      .eq("id", id);

    if (updateResponse.error) {
      return jsonError(updateResponse.error.message || "Unable to update borrow request.", 500);
    }

    // Notify admin? (Optional, but let's just confirm for user)
  } else if (action === "accept_return") {
    if (target.status !== "returning") {
      return jsonError("Action not allowed for current status.");
    }

    const updateResponse = await supabase
      .from("borrow_requests")
      .update({
        status: "returned",
        returned_at: new Date().toISOString(),
        return_condition: body.condition || "Not specified",
      })
      .eq("id", id);

    if (updateResponse.error) {
      return jsonError(updateResponse.error.message || "Unable to update borrow request.", 500);
    }

    const notifyResponse = await supabase.from("notifications").insert({
      user_id: target.userId,
      message: `Thanks! ${item.name} has been accepted and marked as returned. Condition: ${body.condition || "Good"}`,
      type: "success",
      read: false,
    });

    if (notifyResponse.error) {
      return jsonError(notifyResponse.error.message || "Unable to create notification.", 500);
    }
  }

  const [allRequestsResponse, allEquipmentResponse] = await Promise.all([
    supabase.from("borrow_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("equipment").select("*"),
  ]);

  if (allRequestsResponse.error) {
    return jsonError(allRequestsResponse.error.message || "Unable to load borrow requests.", 500);
  }

  if (allEquipmentResponse.error) {
    return jsonError(allEquipmentResponse.error.message || "Unable to load equipment.", 500);
  }

  const equipmentMap = new Map(
    (allEquipmentResponse.data ?? []).map((row) => {
      const equipment = mapEquipmentRow(row as EquipmentRow);
      return [equipment.id, equipment] as const;
    }),
  );

  const all = (allRequestsResponse.data ?? [])
    .map((entry) => {
      const requestEntry = mapBorrowRequestRow(entry as BorrowRequestRow);
      const item = equipmentMap.get(requestEntry.equipmentId);
      return {
        ...requestEntry,
        equipmentName: item?.name ?? "Unknown Equipment",
        equipmentImage: item?.image ?? "",
        equipmentCategory: item?.category ?? "",
        overdue: isOverdue(requestEntry),
      };
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return jsonSuccess({ requests: all });
}
