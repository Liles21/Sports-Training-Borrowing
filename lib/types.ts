export type UserRole = "admin" | "borrower";

export type RequestStatus = "pending" | "approved" | "rejected" | "returning" | "returned";

export type NotificationType = "info" | "warning" | "success" | "error";

export type User = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: string;
};

export type PublicUser = Omit<User, "password">;

export type Equipment = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  image: string;
  description: string;
  createdAt: string;
};

export type BorrowRequest = {
  id: string;
  equipmentId: string;
  userId: string;
  userName: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: RequestStatus;
  createdAt: string;
  approvedAt?: string;
  returnedAt?: string;
  returnCondition?: string;
};

export type Notification = {
  id: string;
  userId: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
};

export type Database = {
  users: User[];
  equipment: Equipment[];
  borrowRequests: BorrowRequest[];
  notifications: Notification[];
};

export type DashboardStats = {
  totalEquipment: number;
  borrowedItems: number;
  availableItems: number;
  pendingRequests: number;
  overdueItems: number;
};
