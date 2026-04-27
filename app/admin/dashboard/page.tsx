"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ProtectedPage } from "@/components/ProtectedPage";
import { apiFetch } from "@/lib/client/api";
import { formatDate } from "@/lib/client/format";
import {
  HiOutlineCubeTransparent,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineArrowTrendingUp,
} from "react-icons/hi2";

type AdminDashboardData = {
  stats: {
    totalEquipment: number;
    borrowedItems: number;
    availableItems: number;
    pendingRequests: number;
    overdueItems: number;
  };
  overdueRequests: Array<{
    id: string;
    userName: string;
    equipmentName: string;
    returnDate: string;
    overdueDays: number;
  }>;
  mostBorrowed: Array<{
    equipmentId: string;
    name: string;
    category: string;
    image: string;
    count: number;
  }>;
  recentPending: Array<{
    id: string;
    userName: string;
    equipmentName: string;
    borrowDate: string;
    returnDate: string;
    status: "pending";
  }>;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);

  useEffect(() => {
    apiFetch<AdminDashboardData>("/api/dashboard")
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <ProtectedPage role="admin">
      <AppShell title="Admin Dashboard" role="admin">
        {!data ? (
          <p className="muted">Loading dashboard...</p>
        ) : (
          <div className="admin-dashboard-page">
            <section className="admin-dashboard-header">
              <div>
                <h1>Admin Dashboard</h1>
                <p className="muted">Overview of gym equipment and borrowing activities</p>
              </div>
            </section>

            <section className="stats-grid four admin-stats-grid">
              <article className="admin-stat-card blue">
                <div className="admin-stat-icon blue">
                  <HiOutlineCubeTransparent />
                </div>
                <h4>Total Equipment</h4>
                <strong>{data.stats.totalEquipment}</strong>
              </article>
              <article className="admin-stat-card orange">
                <div className="admin-stat-icon orange">
                  <HiOutlineExclamationTriangle />
                </div>
                <h4>Currently Borrowed</h4>
                <strong>{data.stats.borrowedItems}</strong>
              </article>
              <article className="admin-stat-card green">
                <div className="admin-stat-icon green">
                  <HiOutlineCheckCircle />
                </div>
                <h4>Available Items</h4>
                <strong>{data.stats.availableItems}</strong>
              </article>
              <article className="admin-stat-card pink">
                <div className="admin-stat-icon pink">
                  <HiOutlineClipboardDocumentList />
                </div>
                <h4>Pending Requests</h4>
                <strong>{data.stats.pendingRequests}</strong>
              </article>
            </section>

            <section className="dashboard-panel">
              <h3 className="panel-heading with-icon">
                <HiOutlineArrowTrendingUp />
                Most Borrowed Equipment
              </h3>
              <div className="admin-borrowed-list">
                {data.mostBorrowed.map((entry, index) => (
                  <article key={entry.equipmentId} className="admin-borrowed-row">
                    <div className="admin-borrowed-rank">#{index + 1}</div>
                    <img src={entry.image} alt={entry.name} />
                    <div className="admin-borrowed-copy">
                      <h4>{entry.name}</h4>
                      <p className="muted">{entry.category}</p>
                    </div>
                    <div className="admin-borrowed-count">
                      <strong>{entry.count}</strong>
                      <span>times borrowed</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="dashboard-panel">
              <h3>Recent Pending Requests</h3>
              <div className="admin-request-list">
                {data.recentPending.map((entry) => (
                  <article key={entry.id} className="admin-request-card">
                    <div>
                      <h4>{entry.userName}</h4>
                      <p>{entry.equipmentName} × 1</p>
                      <span>{formatDate(entry.borrowDate)} - {formatDate(entry.returnDate)}</span>
                    </div>
                    <span className="admin-request-status pending">Pending</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </AppShell>
    </ProtectedPage>
  );
}
