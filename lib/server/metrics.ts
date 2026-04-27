import type { BorrowRequest, Equipment } from "@/lib/types";

export function getMostBorrowed(
  equipment: Equipment[],
  requests: BorrowRequest[],
  limit = 5,
): Array<{
  equipmentId: string;
  name: string;
  category: string;
  image: string;
  count: number;
}> {
  const counts = new Map<string, number>();

  for (const req of requests) {
    if (req.status === "approved" || req.status === "returned") {
      counts.set(req.equipmentId, (counts.get(req.equipmentId) ?? 0) + req.quantity);
    }
  }

  return equipment
    .map((item) => ({
      equipmentId: item.id,
      name: item.name,
      category: item.category,
      image: item.image,
      count: counts.get(item.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
