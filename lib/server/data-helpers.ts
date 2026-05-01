import type { BorrowRequest, Equipment, Notification } from "@/lib/types";

export type EquipmentRow = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  image: string;
  description: string;
  created_at: string;
  status?: string;
};

export type BorrowRequestRow = {
  id: string;
  equipment_id: string;
  user_id: string;
  user_name: string;
  quantity: number;
  borrow_date: string;
  return_date: string;
  status: BorrowRequest["status"];
  created_at: string;
  approved_at: string | null;
  returned_at: string | null;
  return_condition: string | null;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  message: string;
  type: Notification["type"];
  read: boolean;
  created_at: string;
};

export function mapEquipmentRow(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    image: row.image,
    description: row.description,
    createdAt: row.created_at,
    status: row.status ?? "available",
  };
}

export function mapBorrowRequestRow(row: BorrowRequestRow): BorrowRequest {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    userId: row.user_id,
    userName: row.user_name,
    quantity: row.quantity,
    borrowDate: row.borrow_date,
    returnDate: row.return_date,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at ?? undefined,
    returnedAt: row.returned_at ?? undefined,
    returnCondition: row.return_condition ?? undefined,
  };
}

export function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    message: row.message,
    type: row.type,
    read: row.read,
    createdAt: row.created_at,
  };
}

export function isOverdue(req: Pick<BorrowRequest, "status" | "returnDate">): boolean {
  if (req.status !== "approved") {
    return false;
  }

  return new Date(req.returnDate).getTime() < Date.now();
}

export function computeAvailableForEquipment(
  item: Equipment,
  requests: BorrowRequest[],
): number {
  const approvedCount = requests
    .filter((req) => req.equipmentId === item.id && (req.status === "approved" || req.status === "returning"))
    .reduce((sum, req) => sum + req.quantity, 0);

  return Math.max(item.quantity - approvedCount, 0);
}

export function computeReservableForEquipment(
  item: Equipment,
  requests: BorrowRequest[],
): number {
  const reservedCount = requests
    .filter(
      (req) =>
        req.equipmentId === item.id &&
        (req.status === "approved" || req.status === "pending" || req.status === "returning"),
    )
    .reduce((sum, req) => sum + req.quantity, 0);

  return Math.max(item.quantity - reservedCount, 0);
}
