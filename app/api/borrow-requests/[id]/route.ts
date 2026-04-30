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
import type { Equipment } from "@/lib/types";

type UpdateBody = {
  action?: "approve" | "reject" | "return" | "accept_return";
  condition?: string;
};

type RouteContext<T> = {
  params: Promise<T extends string ? Record<string, string> : T>;
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
    if (target.status === "approved") {
      return jsonSuccess({ requests: await getAllRequests(supabase) });
    }
    if (target.status !== "pending") {
      return jsonError(`Cannot approve a request that is currently ${target.status}.`);
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
    if (target.status === "rejected") {
      return jsonSuccess({ requests: await getAllRequests(supabase) });
    }
    if (target.status !== "pending") {
      return jsonError(`Cannot reject a request that is currently ${target.status}.`);
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
    if (target.status === "returning" || target.status === "returned") {
      return jsonSuccess({ requests: await getAllRequests(supabase) });
    }
    if (target.status !== "approved") {
      return jsonError(`Only approved equipment can be returned. Current status: ${target.status}.`);
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
    if (target.status === "returned") {
      return jsonSuccess({ requests: await getAllRequests(supabase) });
    }
    if (target.status !== "returning") {
      return jsonError(`Cannot accept return for a request that is currently ${target.status}.`);
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

  return jsonSuccess({ requests: await getAllRequests(supabase) });
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/borrow-requests/[id]">,
): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const supabase = getSupabaseServiceClient();

  const requestResponse = await supabase
    .from("borrow_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (requestResponse.error) {
    return jsonError(requestResponse.error.message || "Unable to load record.", 500);
  }

  if (!requestResponse.data) {
    return jsonError("Record not found.", 404);
  }

  const target = mapBorrowRequestRow(requestResponse.data as BorrowRequestRow);

  // Authorization check
  if (auth.user.role !== "admin") {
    if (auth.user.id !== target.userId) {
      return jsonError("Not authorized to delete this record.", 403);
    }

    if (target.status === "approved" || target.status === "returning") {
      return jsonError("Cannot delete an active borrowing record. Please return the equipment first.");
    }
  }

  const deleteResponse = await supabase.from("borrow_requests").delete().eq("id", id);

  if (deleteResponse.error) {
    return jsonError(deleteResponse.error.message || "Unable to delete record.", 500);
  }

  return jsonSuccess({ message: "Record deleted." });
}

async function getAllRequests(supabase: any) {
  const [allRequestsResponse, allEquipmentResponse] = await Promise.all([
    supabase.from("borrow_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("equipment").select("*"),
  ]);

  if (allRequestsResponse.error) {
    throw new Error(allRequestsResponse.error.message || "Unable to load borrow requests.");
  }

  if (allEquipmentResponse.error) {
    throw new Error(allEquipmentResponse.error.message || "Unable to load equipment.");
  }

  const equipmentMap = new Map<string, Equipment>(
    (allEquipmentResponse.data ?? []).map((row: any) => {
      const equipment = mapEquipmentRow(row as EquipmentRow);
      return [equipment.id, equipment] as const;
    }),
  );

  return (allRequestsResponse.data ?? [])
    .map((entry: any) => {
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
    .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
}
