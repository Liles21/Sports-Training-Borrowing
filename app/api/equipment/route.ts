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

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getSupabaseServiceClient();
  const [equipmentResponse, borrowResponse] = await Promise.all([
    supabase.from("equipment").select("*").order("created_at", { ascending: false }),
    supabase
      .from("borrow_requests")
      .select("*")
      .in("status", ["approved", "returning"])
      .order("created_at", { ascending: false }),
  ]);

  if (equipmentResponse.error) {
    return jsonError(equipmentResponse.error.message || "Unable to load equipment.", 500);
  }

  if (borrowResponse.error) {
    return jsonError(borrowResponse.error.message || "Unable to load borrow requests.", 500);
  }

  const equipment = (equipmentResponse.data ?? []).map((row) =>
    mapEquipmentRow(row as EquipmentRow),
  );
  const approvedRequests = (borrowResponse.data ?? []).map((row) =>
    mapBorrowRequestRow(row as BorrowRequestRow),
  );
  const items = equipment.map((item) => ({
    ...item,
    available: computeAvailableForEquipment(item, approvedRequests),
  }));

  return jsonSuccess({
    equipment: items,
    categories: Array.from(new Set(items.map((entry) => entry.category))).sort(),
  });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleResponse = requireRole(auth.user, ["admin"]);
  if (roleResponse) {
    return roleResponse;
  }

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
  const insertResponse = await supabase.from("equipment").insert({
    name,
    category,
    quantity,
    image,
    description,
  });

  if (insertResponse.error) {
    return jsonError(insertResponse.error.message || "Unable to create equipment.", 500);
  }

  const [equipmentResponse, borrowResponse] = await Promise.all([
    supabase.from("equipment").select("*").order("created_at", { ascending: false }),
    supabase
      .from("borrow_requests")
      .select("*")
      .in("status", ["approved", "returning"])
      .order("created_at", { ascending: false }),
  ]);

  if (equipmentResponse.error) {
    return jsonError(equipmentResponse.error.message || "Unable to load equipment.", 500);
  }

  if (borrowResponse.error) {
    return jsonError(borrowResponse.error.message || "Unable to load borrow requests.", 500);
  }

  const equipment = (equipmentResponse.data ?? []).map((row) =>
    mapEquipmentRow(row as EquipmentRow),
  );
  const approvedRequests = (borrowResponse.data ?? []).map((row) =>
    mapBorrowRequestRow(row as BorrowRequestRow),
  );
  const items = equipment.map((item) => ({
    ...item,
    available: computeAvailableForEquipment(item, approvedRequests),
  }));

  return jsonSuccess({ equipment: items }, 201);
}
