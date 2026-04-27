import {
  computeAvailableForEquipment,
  computeReservableForEquipment,
  isOverdue,
  mapBorrowRequestRow,
  mapEquipmentRow,
  type BorrowRequestRow,
  type EquipmentRow,
} from "@/lib/server/data-helpers";
import { requireAuth } from "@/lib/server/guards";
import { jsonError, jsonSuccess } from "@/lib/server/responses";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

type CreateBorrowBody = {
  equipmentId?: string;
  quantity?: number;
  borrowDate?: string;
  returnDate?: string;
};

async function withDetails() {
  const supabase = getSupabaseServiceClient();
  const [requestsResponse, equipmentResponse] = await Promise.all([
    supabase.from("borrow_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("equipment").select("*"),
  ]);

  if (requestsResponse.error) {
    throw new Error(requestsResponse.error.message || "Unable to load borrow requests.");
  }

  if (equipmentResponse.error) {
    throw new Error(equipmentResponse.error.message || "Unable to load equipment.");
  }

  const equipmentMap = new Map(
    (equipmentResponse.data ?? []).map((row) => {
      const item = mapEquipmentRow(row as EquipmentRow);
      return [item.id, item] as const;
    }),
  );

  return (requestsResponse.data ?? [])
    .map((row) => {
      const request = mapBorrowRequestRow(row as BorrowRequestRow);
      const equipment = equipmentMap.get(request.equipmentId);
      return {
        ...request,
        equipmentName: equipment?.name ?? "Unknown Equipment",
        equipmentImage: equipment?.image ?? "",
        equipmentCategory: equipment?.category ?? "",
        overdue: isOverdue(request),
      };
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const all = await withDetails().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unable to load borrow requests.";
    return message;
  });

  if (typeof all === "string") {
    return jsonError(all, 500);
  }

  if (auth.user.role === "admin") {
    return jsonSuccess({ requests: all });
  }

  return jsonSuccess({
    requests: all.filter((entry) => entry.userId === auth.user.id),
  });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (auth.user.role !== "borrower") {
    return jsonError("Only borrowers can create requests.", 403);
  }

  const body = (await request.json()) as CreateBorrowBody;
  const equipmentId = (body.equipmentId ?? "").trim();
  const quantity = Number(body.quantity ?? 0);
  const borrowDate = body.borrowDate ?? "";
  const returnDate = body.returnDate ?? "";

  if (!equipmentId || !borrowDate || !returnDate || !Number.isFinite(quantity)) {
    return jsonError("All fields are required.");
  }

  if (quantity < 1) {
    return jsonError("Quantity must be at least 1.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const borrowAt = new Date(borrowDate);
  const returnAt = new Date(returnDate);
  borrowAt.setHours(0, 0, 0, 0);
  returnAt.setHours(0, 0, 0, 0);

  if (+borrowAt < +today) {
    return jsonError("Borrow date cannot be before today.");
  }

  if (+returnAt < +borrowAt) {
    return jsonError("Return date cannot be before borrow date.");
  }

  const supabase = getSupabaseServiceClient();
  const [equipmentResponse, reservableResponse] = await Promise.all([
    supabase.from("equipment").select("*").eq("id", equipmentId).maybeSingle(),
    supabase
      .from("borrow_requests")
      .select("*")
      .eq("equipment_id", equipmentId)
      .in("status", ["pending", "approved"]),
  ]);

  if (equipmentResponse.error) {
    return jsonError(equipmentResponse.error.message || "Unable to load equipment.", 500);
  }

  if (!equipmentResponse.data) {
    return jsonError("Equipment not found.", 404);
  }

  if (reservableResponse.error) {
    return jsonError(reservableResponse.error.message || "Unable to validate stock.", 500);
  }

  const item = mapEquipmentRow(equipmentResponse.data as EquipmentRow);
  const reservable = computeReservableForEquipment(
    item,
    (reservableResponse.data ?? []).map((row) => mapBorrowRequestRow(row as BorrowRequestRow)),
  );

  if (quantity > reservable) {
    return jsonError("Requested quantity is not available.");
  }

  const insertRequest = await supabase.from("borrow_requests").insert({
    equipment_id: equipmentId,
    user_id: auth.user.id,
    user_name: auth.user.name,
    quantity,
    borrow_date: borrowDate,
    return_date: returnDate,
    status: "pending",
  });

  if (insertRequest.error) {
    return jsonError(insertRequest.error.message || "Unable to create borrow request.", 500);
  }

  const adminProfiles = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (adminProfiles.error) {
    return jsonError(adminProfiles.error.message || "Unable to notify admins.", 500);
  }

  const notifications = [
    ...(adminProfiles.data ?? []).map((admin) => ({
      user_id: admin.id,
      message: `${auth.user.name} submitted a borrow request for ${item.name}.`,
      type: "info" as const,
      read: false,
    })),
    {
      user_id: auth.user.id,
      message: `Your request for ${item.name} is pending approval.`,
      type: "info" as const,
      read: false,
    },
  ];

  const insertNotifications = await supabase.from("notifications").insert(notifications);
  if (insertNotifications.error) {
    return jsonError(insertNotifications.error.message || "Unable to create notifications.", 500);
  }

  const approvedResponse = await supabase
    .from("borrow_requests")
    .select("*")
    .eq("equipment_id", equipmentId)
    .eq("status", "approved");

  if (approvedResponse.error) {
    return jsonError(approvedResponse.error.message || "Unable to recalculate availability.", 500);
  }

  const available = computeAvailableForEquipment(
    item,
    (approvedResponse.data ?? []).map((row) => mapBorrowRequestRow(row as BorrowRequestRow)),
  );

  return jsonSuccess({ message: "Borrow request submitted.", available }, 201);
}
