"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ProtectedPage } from "@/components/ProtectedPage";
import { apiFetch } from "@/lib/client/api";
import { formatDate, statusClass } from "@/lib/client/format";
import { HiClock, HiCube, HiCheckCircle, HiXCircle } from "react-icons/hi2";
import { useAuth } from "@/contexts/AuthContext";

type DashboardData = {
  stats: {
    pendingRequests: number;
    activeBorrows: number;
    returned: number;
    rejected: number;
    overdueItems: number;
  };
  overdue: Array<{ id: string; returnDate: string; equipmentId: string; quantity: number }>;
  activeBorrows: Array<{
    id: string;
    equipmentName: string;
    equipmentImage: string;
    quantity: number;
    returnDate: string;
    status: "approved";
    overdue: boolean;
  }>;
  recentRequests: Array<{
    id: string;
    equipmentName: string;
    quantity: number;
    borrowDate: string;
    returnDate: string;
    status: "pending" | "approved" | "rejected" | "returned";
    createdAt: string;
  }>;
};

export default function BorrowerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard").then(setData).catch(() => setData(null));
  }, []);

  return (
    <ProtectedPage role="borrower">
      <AppShell title="Dashboard" role="borrower">
        {!data ? (
          <p className="muted">Loading dashboard...</p>
        ) : (
          <div className="borrower-dashboard-page">
            <section className="borrower-dashboard-header">
              <div>
                <h1>Welcome, {user?.name ?? "Borrower"}!</h1>
                <p>Manage your equipment borrowing requests</p>
              </div>
            </section>

            {data.stats.overdueItems > 0 && (
              <div className="warning-banner">
                You have {data.stats.overdueItems} overdue item(s). Please return them ASAP.
              </div>
            )}

            <section className="stats-grid four borrower-stats-grid">
              <article className="borrower-stat-card yellow">
                <div className="borrower-stat-icon yellow">
                  <HiClock />
                </div>
                <h4>Pending Requests</h4>
                <strong>{data.stats.pendingRequests}</strong>
              </article>
              <article className="borrower-stat-card blue">
                <div className="borrower-stat-icon blue">
                  <HiCube />
                </div>
                <h4>Active Borrows</h4>
                <strong>{data.stats.activeBorrows}</strong>
              </article>
              <article className="borrower-stat-card green">
                <div className="borrower-stat-icon green">
                  <HiCheckCircle />
                </div>
                <h4>Returned</h4>
                <strong>{data.stats.returned}</strong>
              </article>
              <article className="borrower-stat-card red">
                <div className="borrower-stat-icon red">
                  <HiXCircle />
                </div>
                <h4>Rejected</h4>
                <strong>{data.stats.rejected}</strong>
              </article>
            </section>

            <section className="borrower-panel">
              <h3>Active Borrows</h3>
              <div className="borrower-active-list">
                {data.activeBorrows.map((entry) => (
                  <article
                    key={entry.id}
                    className={entry.overdue ? "borrower-active-card overdue" : "borrower-active-card"}
                  >
                    <img src={entry.equipmentImage} alt={entry.equipmentName} />
                    <div>
                      <h4>{entry.equipmentName}</h4>
                      <p>Quantity: {entry.quantity}</p>
                      <p>Return Date: {formatDate(entry.returnDate)}</p>
                    </div>
                  </article>
                ))}
                {data.activeBorrows.length === 0 && <p className="muted">No active borrows.</p>}
              </div>
            </section>

            <section className="borrower-panel">
              <h3>Recent Requests</h3>
              <div className="borrower-recent-list">
                {data.recentRequests.map((entry) => (
                  <article key={entry.id} className="borrower-recent-card">
                    <div>
                      <h4>{entry.equipmentName}</h4>
                      <p>{formatDate(entry.borrowDate)} - {formatDate(entry.returnDate)}</p>
                    </div>
                    <span className={statusClass(entry.status)}>{entry.status}</span>
                  </article>
                ))}
                {data.recentRequests.length === 0 && <p className="muted">No recent requests.</p>}
              </div>
            </section>
          </div>
        )}
      </AppShell>
    </ProtectedPage>
  );
}
