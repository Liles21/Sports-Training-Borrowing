import {
  isOverdue,
  mapBorrowRequestRow,
  mapEquipmentRow,
  type BorrowRequestRow,
  type EquipmentRow,
} from "@/lib/server/data-helpers";
import { requireAuth } from "@/lib/server/guards";
import { jsonError, jsonSuccess } from "@/lib/server/responses";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

function toRows(
  data: {
    borrowRequests: Array<ReturnType<typeof mapBorrowRequestRow>>;
    equipmentMap: Map<string, ReturnType<typeof mapEquipmentRow>>;
  },
  userId?: string,
): Array<Record<string, string | number | boolean>> {
  return data.borrowRequests
    .filter((entry) => (userId ? entry.userId === userId : true))
    .map((entry) => {
      const item = data.equipmentMap.get(entry.equipmentId);
      return {
        id: entry.id,
        date: entry.createdAt,
        borrower: entry.userName,
        equipment: item?.name ?? "Unknown Equipment",
        equipmentImage: item?.image ?? "",
        category: item?.category ?? "",
        quantity: entry.quantity,
        borrowDate: entry.borrowDate,
        returnDate: entry.returnDate,
        status: entry.status,
        overdue: isOverdue(entry),
      };
    })
    .sort((a, b) => +new Date(String(b.date)) - +new Date(String(a.date)));
}

function toCsv(rows: Array<Record<string, string | number | boolean>>): string {
  const headers = [
    "Date",
    "Borrower",
    "Equipment",
    "Category",
    "Quantity",
    "Borrow Date",
    "Return Date",
    "Status",
    "Overdue",
  ];

  const lines = rows.map((row) =>
    [
      row.date,
      row.borrower,
      row.equipment,
      row.category,
      row.quantity,
      row.borrowDate,
      row.returnDate,
      row.status,
      row.overdue,
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const supabase = getSupabaseServiceClient();
  const [borrowResponse, equipmentResponse] = await Promise.all([
    supabase.from("borrow_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("equipment").select("*"),
  ]);

  if (borrowResponse.error) {
    return jsonError(borrowResponse.error.message || "Unable to load history.", 500);
  }

  if (equipmentResponse.error) {
    return jsonError(equipmentResponse.error.message || "Unable to load equipment.", 500);
  }

  const data = {
    borrowRequests: (borrowResponse.data ?? []).map((row) =>
      mapBorrowRequestRow(row as BorrowRequestRow),
    ),
    equipmentMap: new Map(
      (equipmentResponse.data ?? []).map((row) => {
        const item = mapEquipmentRow(row as EquipmentRow);
        return [item.id, item] as const;
      }),
    ),
  };

  const rows = auth.user.role === "admin" ? toRows(data) : toRows(data, auth.user.id);

  if (format === "csv") {
    const csv = toCsv(rows);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${auth.user.role}-history.csv`,
      },
    });
  }

  const total = rows.length;
  const completed = rows.filter((row) => row.status === "returned").length;
  const active = rows.filter((row) => row.status === "approved").length;

  return jsonSuccess({ rows, summary: { total, completed, active } });
}
