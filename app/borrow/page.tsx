"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ProtectedPage } from "@/components/ProtectedPage";
import { apiFetch } from "@/lib/client/api";
import { formatDate, statusClass } from "@/lib/client/format";
import {
  HiOutlineCalendarDays,
  HiOutlineFunnel,
  HiOutlineClock,
} from "react-icons/hi2";

type BorrowRow = {
  id: string;
  equipmentName: string;
  equipmentImage: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  createdAt?: string;
  status: "pending" | "approved" | "rejected" | "returning" | "returned";
  overdue: boolean;
};

export default function BorrowRequestsPage() {
  const [rows, setRows] = useState<BorrowRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<{ requests: BorrowRow[] }>("/api/borrow-requests");
      setRows(data.requests);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleReturn(id: string) {
    if (!confirm("Are you sure you want to return this equipment?")) return;

    setLoadingId(id);
    try {
      await apiFetch(`/api/borrow-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "return" }),
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Return failed.");
    } finally {
      setLoadingId(null);
    }
  }

  const filtered = useMemo(
    () => rows.filter((entry) => (filter === "all" ? true : entry.status === filter)),
    [filter, rows],
  );

  const stats = useMemo(
    () => ({
      pending: rows.filter((entry) => entry.status === "pending").length,
      approved: rows.filter((entry) => entry.status === "approved").length,
      returning: rows.filter((entry) => entry.status === "returning").length,
      returned: rows.filter((entry) => entry.status === "returned").length,
      rejected: rows.filter((entry) => entry.status === "rejected").length,
    }),
    [rows],
  );

  return (
    <ProtectedPage role="borrower">
      <AppShell title="My Borrow Requests" role="borrower">
        <div className="requests-page">
          <section className="requests-header">
            <div>
              <h1>My Borrow Requests</h1>
              <p className="muted">Track your equipment borrowing requests</p>
            </div>

            <div className="requests-filter">
              <HiOutlineFunnel />
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="returning">Returning</option>
                <option value="returned">Returned</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </section>

          <section className="request-stats-grid">
            <article className="request-stat pending">
              <h4>Pending</h4>
              <strong>{stats.pending}</strong>
            </article>
            <article className="request-stat approved">
              <h4>Approved</h4>
              <strong>{stats.approved}</strong>
            </article>
            <article className="request-stat returned">
              <h4>Returned</h4>
              <strong>{stats.returned}</strong>
            </article>
            <article className="request-stat rejected">
              <h4>Rejected</h4>
              <strong>{stats.rejected}</strong>
            </article>
          </section>

          <div className="requests-list">
            {filtered.map((entry) => (
              <article key={entry.id} className={`request-card ${entry.status}`}>
                <img src={entry.equipmentImage} alt={entry.equipmentName} />

                <div className="request-main">
                  <div className="request-title-row">
                    <div>
                      <h4>{entry.equipmentName}</h4>
                      <p className="muted">Quantity</p>
                      <strong>{entry.quantity}</strong>
                    </div>
                    <span className={statusClass(entry.status)}>{entry.status}</span>
                  </div>

                  <div className="request-dates">
                    <div>
                      <p className="muted">Borrow Date</p>
                      <strong>{formatDate(entry.borrowDate)}</strong>
                    </div>
                    <div>
                      <p className="muted">Return Date</p>
                      <strong>{formatDate(entry.returnDate)}</strong>
                    </div>
                  </div>

                  <p className="request-created muted">
                    <HiOutlineCalendarDays />
                    Requested on: {formatDate(entry.createdAt ?? entry.borrowDate)}
                  </p>

                  {entry.status === "pending" && (
                    <div className="request-note">
                      <HiOutlineClock />
                      Waiting for admin approval
                    </div>
                  )}

                  {entry.status === "approved" && (
                    <div className="button-row" style={{ marginTop: "1rem" }}>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => handleReturn(entry.id)}
                        disabled={loadingId === entry.id}
                      >
                        {loadingId === entry.id ? "Processing..." : "Return Equipment"}
                      </button>
                    </div>
                  )}

                  {entry.status === "returning" && (
                    <div className="request-note info" style={{ color: "var(--primary)" }}>
                      <HiOutlineClock />
                      Waiting for admin to accept return
                    </div>
                  )}
                </div>
              </article>
            ))}

            {filtered.length === 0 && <p className="muted">No requests found.</p>}
          </div>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
