import {
  computeAvailableForEquipment,
  isOverdue,
  mapBorrowRequestRow,
  mapEquipmentRow,
  type BorrowRequestRow,
  type EquipmentRow,
} from "@/lib/server/data-helpers";
import { getMostBorrowed } from "@/lib/server/metrics";
import { requireAuth } from "@/lib/server/guards";
import { jsonSuccess } from "@/lib/server/responses";
import { jsonError } from "@/lib/server/responses";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getSupabaseServiceClient();
  const [equipmentResponse, borrowResponse] = await Promise.all([
    supabase.from("equipment").select("*").order("created_at", { ascending: false }),
    supabase.from("borrow_requests").select("*").order("created_at", { ascending: false }),
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
  const borrowRequests = (borrowResponse.data ?? []).map((row) =>
    mapBorrowRequestRow(row as BorrowRequestRow),
  );
  const equipmentMap = new Map(equipment.map((item) => [item.id, item] as const));

  if (auth.user.role === "admin") {
    const totalEquipment = equipment.reduce((sum, item) => sum + item.quantity, 0);
    const borrowedItems = borrowRequests
      .filter((entry) => entry.status === "approved")
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const availableItems = equipment.reduce(
      (sum, item) => sum + computeAvailableForEquipment(item, borrowRequests),
      0,
    );
    const pendingRequests = borrowRequests.filter((entry) => entry.status === "pending").length;
    const overdueRequests = borrowRequests
      .filter((entry) => isOverdue(entry))
      .map((entry) => {
        const item = equipmentMap.get(entry.equipmentId);
        return {
          ...entry,
          equipmentName: item?.name ?? "Unknown Equipment",
          equipmentImage: item?.image ?? "",
          overdueDays: Math.ceil(
            (Date.now() - new Date(entry.returnDate).getTime()) / (1000 * 60 * 60 * 24),
          ),
        };
      });

    const recentPending = borrowRequests
      .filter((entry) => entry.status === "pending")
      .map((entry) => {
        const item = equipmentMap.get(entry.equipmentId);
        return {
          ...entry,
          equipmentName: item?.name ?? "Unknown Equipment",
        };
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 5);

    return jsonSuccess({
      stats: {
        totalEquipment,
        borrowedItems,
        availableItems,
        pendingRequests,
        overdueItems: overdueRequests.length,
      },
      overdueRequests,
      mostBorrowed: getMostBorrowed(equipment, borrowRequests, 5),
      recentPending,
    });
  }

  const own = borrowRequests.filter((entry) => entry.userId === auth.user.id);
  const pending = own.filter((entry) => entry.status === "pending").length;
  const active = own.filter((entry) => entry.status === "approved").length;
  const returned = own.filter((entry) => entry.status === "returned").length;
  const rejected = own.filter((entry) => entry.status === "rejected").length;
  const overdue = own.filter((entry) => isOverdue(entry));

  const activeBorrows = own
    .filter((entry) => entry.status === "approved")
    .map((entry) => {
      const item = equipmentMap.get(entry.equipmentId);
      return {
        ...entry,
        equipmentName: item?.name ?? "Unknown Equipment",
        equipmentImage: item?.image ?? "",
        overdue: isOverdue(entry),
      };
    })
    .sort((a, b) => +new Date(a.returnDate) - +new Date(b.returnDate));

  const recent = own
    .map((entry) => {
      const item = equipmentMap.get(entry.equipmentId);
      return {
        ...entry,
        equipmentName: item?.name ?? "Unknown Equipment",
      };
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  return jsonSuccess({
    stats: {
      pendingRequests: pending,
      activeBorrows: active,
      returned,
      rejected,
      overdueItems: overdue.length,
    },
    overdue,
    activeBorrows,
    recentRequests: recent,
  });
}
