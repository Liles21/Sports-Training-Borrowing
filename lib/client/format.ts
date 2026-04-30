import type { RequestStatus } from "@/lib/types";

export function statusClass(status: RequestStatus): string {
  if (status === "pending") return "status pending";
  if (status === "approved") return "status approved";
  if (status === "returning") return "status returning";
  if (status === "returned") return "status returned";
  return "status rejected";
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}
