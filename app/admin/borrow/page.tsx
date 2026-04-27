"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ProtectedPage } from "@/components/ProtectedPage";
import { apiFetch } from "@/lib/client/api";
import { formatDate, statusClass } from "@/lib/client/format";
import {
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineFunnel,
  HiOutlineXCircle,
} from "react-icons/hi2";

type BorrowRow = {
  id: string;
  userName: string;
  equipmentName: string;
  equipmentImage: string;
  equipmentCategory: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected" | "returned";
  overdue: boolean;
};

export default function AdminBorrowPage() {
  const [rows, setRows] = useState<BorrowRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<{ requests: BorrowRow[] }>("/api/borrow-requests");
    setRows(data.requests);
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await load();
      } catch {
        if (active) {
          setError("Unable to load borrow requests.");
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => rows.filter((entry) => (filter === "all" ? true : entry.status === filter)),
    [filter, rows],
  );

  const stats = useMemo(
    () => ({
      pending: rows.filter((entry) => entry.status === "pending").length,
      approved: rows.filter((entry) => entry.status === "approved").length,
      returned: rows.filter((entry) => entry.status === "returned").length,
      rejected: rows.filter((entry) => entry.status === "rejected").length,
    }),
    [rows],
  );

  async function patchStatus(id: string, action: "approve" | "reject" | "return") {
    setError(null);

    try {
      const data = await apiFetch<{ requests: BorrowRow[] }>(`/api/borrow-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setRows(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  return (
    <ProtectedPage role="admin">
      <AppShell title="Borrow Workflow" role="admin">
        <div className="requests-page admin-borrow-page">
          <section className="requests-header admin-requests-header">
            <div>
              <h1>Borrow Requests</h1>
              <p className="muted">Manage equipment borrowing requests and approvals</p>
            </div>

            <div className="requests-filter admin-requests-filter">
              <HiOutlineFunnel />
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="returned">Returned</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </section>

          <section className="request-stats-grid admin-request-stats-grid">
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

          {error && <p className="alert error">{error}</p>}

          <div className="requests-list admin-requests-list">
            {filtered.map((entry) => (
              <article key={entry.id} className={`request-card admin-request-row ${entry.status}`}>
                <img src={entry.equipmentImage} alt={entry.equipmentName} />

                <div className="request-main">
                  <div className="request-title-row">
                    <div>
                      <h4>{entry.equipmentName}</h4>
                      <p className="muted">{entry.equipmentCategory || "Uncategorized"}</p>
                    </div>
                    <span className={statusClass(entry.status)}>{entry.status}</span>
                  </div>

                  <div className="admin-request-columns">
                    <div>
                      <p className="muted">Borrower</p>
                      <strong>{entry.userName}</strong>
                    </div>
                    <div>
                      <p className="muted">Quantity</p>
                      <strong>{entry.quantity}</strong>
                    </div>
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
                    Requested on: {new Date(entry.createdAt ?? entry.borrowDate).toLocaleString()}
                  </p>

                  <div className="button-row admin-request-actions">
                    {entry.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="btn success"
                          onClick={() => patchStatus(entry.id, "approve")}
                        >
                          <HiOutlineCheckCircle />
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => patchStatus(entry.id, "reject")}
                        >
                          <HiOutlineXCircle />
                          Reject
                        </button>
                      </>
                    )}
                    {entry.status === "approved" && (
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => patchStatus(entry.id, "return")}
                      >
                        <HiOutlineArrowPath />
                        Mark as Returned
                      </button>
                    )}
                  </div>
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
