import {
  computeAvailableForEquipment,
  mapBorrowRequestRow,
  mapEquipmentRow,
  type BorrowRequestRow,
  type EquipmentRow,
} from "@/lib/server/data-helpers";
import { requireAuth, requireRole } from "@/lib/server/guards";
import { jsonError, jsonSuccess } from "@/lib/server/responses";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

type EquipmentBody = {
  name?: string;
  category?: string;
  quantity?: number;
  image?: string;
  description?: string;
};

export async function PUT(
  request: Request,
  context: RouteContext<"/api/equipment/[id]">,
): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleResponse = requireRole(auth.user, ["admin"]);
  if (roleResponse) {
    return roleResponse;
  }

  const { id } = await context.params;
  const body = (await request.json()) as EquipmentBody;
  const name = (body.name ?? "").trim();
  const category = (body.category ?? "").trim();
  const quantity = Number(body.quantity ?? 0);
  const image = (body.image ?? "").trim();
  const description = (body.description ?? "").trim();

  if (!name || !category || !image || !description || !Number.isFinite(quantity)) {
    return jsonError("All fields are required.");
  }

  if (quantity < 1) {
    return jsonError("Quantity must be at least 1.");
  }

  const supabase = getSupabaseServiceClient();

  const [equipmentResponse, approvedResponse] = await Promise.all([
    supabase.from("equipment").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("borrow_requests")
      .select("quantity")
      .eq("equipment_id", id)
      .eq("status", "approved"),
  ]);

  if (equipmentResponse.error) {
    return jsonError(equipmentResponse.error.message || "Unable to load equipment.", 500);
  }

  if (!equipmentResponse.data) {
    return jsonError("Equipment not found.", 404);
  }

  if (approvedResponse.error) {
    return jsonError(approvedResponse.error.message || "Unable to validate quantity.", 500);
  }

  const currentlyBorrowed = (approvedResponse.data ?? []).reduce(
    (sum, req) => sum + Number(req.quantity ?? 0),
    0,
  );

  if (quantity < currentlyBorrowed) {
    return jsonError("Quantity cannot be less than currently approved borrows.");
  }

  const updateResponse = await supabase
    .from("equipment")
    .update({ name, category, quantity, image, description })
    .eq("id", id);

  if (updateResponse.error) {
    return jsonError(updateResponse.error.message || "Unable to update equipment.", 500);
  }

  const [allEquipmentResponse, allBorrowResponse] = await Promise.all([
    supabase.from("equipment").select("*").order("created_at", { ascending: false }),
    supabase
      .from("borrow_requests")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
  ]);

  if (allEquipmentResponse.error) {
    return jsonError(allEquipmentResponse.error.message || "Unable to load equipment.", 500);
  }

  if (allBorrowResponse.error) {
    return jsonError(allBorrowResponse.error.message || "Unable to load borrow requests.", 500);
  }

  const equipment = (allEquipmentResponse.data ?? []).map((row) =>
    mapEquipmentRow(row as EquipmentRow),
  );
  const approvedRequests = (allBorrowResponse.data ?? []).map((row) =>
    mapBorrowRequestRow(row as BorrowRequestRow),
  );

  const items = equipment.map((item) => ({
    ...item,
    available: computeAvailableForEquipment(item, approvedRequests),
  }));

  return jsonSuccess({ equipment: items });
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/equipment/[id]">,
): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleResponse = requireRole(auth.user, ["admin"]);
  if (roleResponse) {
    return roleResponse;
  }

  const { id } = await context.params;

  const supabase = getSupabaseServiceClient();
  const [equipmentResponse, activeResponse] = await Promise.all([
    supabase.from("equipment").select("id").eq("id", id).maybeSingle(),
    supabase
      .from("borrow_requests")
      .select("id")
      .eq("equipment_id", id)
      .in("status", ["pending", "approved"])
      .limit(1),
  ]);

  if (equipmentResponse.error) {
    return jsonError(equipmentResponse.error.message || "Unable to load equipment.", 500);
  }

  if (!equipmentResponse.data) {
    return jsonError("Equipment not found.", 404);
  }

  if (activeResponse.error) {
    return jsonError(activeResponse.error.message || "Unable to validate equipment state.", 500);
  }

  if ((activeResponse.data ?? []).length > 0) {
    return jsonError("Cannot delete equipment with active borrow requests.");
  }

  const deleteResponse = await supabase.from("equipment").delete().eq("id", id);
  if (deleteResponse.error) {
    return jsonError(deleteResponse.error.message || "Unable to delete equipment.", 500);
  }

  return jsonSuccess({ message: "Equipment deleted successfully." });
}
