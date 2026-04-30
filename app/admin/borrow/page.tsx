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
  status: "pending" | "approved" | "rejected" | "returning" | "returned";
  overdue: boolean;
  returnCondition?: string;
};

export default function AdminBorrowPage() {
  const [rows, setRows] = useState<BorrowRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [condition, setCondition] = useState("Good condition");
  const [checklist, setChecklist] = useState<{
    parts: boolean;
    damage: boolean;
    clean: boolean;
    functional: boolean;
  }>({
    parts: false,
    damage: false,
    clean: false,
    functional: false,
  });

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

  async function patchStatus(id: string, action: string, condition?: string) {
    setError(null);
    setLoadingId(id);

    try {
      const data = await apiFetch<{ requests: BorrowRow[] }>(`/api/borrow-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, condition }),
      });
      setRows(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setLoadingId(null);
    }
  }

  async function acceptReturn(id: string) {
    setCheckingId(id);
    setCondition("Good condition");
    setChecklist({
      parts: false,
      damage: false,
      clean: false,
      functional: false,
    });
  }

  async function handleConfirmReturn() {
    if (!checkingId) return;

    const checks = [];
    if (checklist.parts) checks.push("All parts present");
    if (checklist.damage) checks.push("No visible damage");
    if (checklist.clean) checks.push("Clean");
    if (checklist.functional) checks.push("Fully functional");

    const finalCondition = checks.length > 0
      ? `[${checks.join(", ")}] ${condition}`
      : condition;

    await patchStatus(checkingId, "accept_return", finalCondition);
    setCheckingId(null);
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
                <option value="returning">Returning</option>
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

                  {entry.returnCondition && (
                    <div className="admin-return-condition">
                      <p className="muted">Return Condition:</p>
                      <p className="condition-text"><strong>{entry.returnCondition}</strong></p>
                    </div>
                  )}

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
                          disabled={loadingId === entry.id}
                        >
                          <HiOutlineCheckCircle />
                          {loadingId === entry.id ? "..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => patchStatus(entry.id, "reject")}
                          disabled={loadingId === entry.id}
                        >
                          <HiOutlineXCircle />
                          {loadingId === entry.id ? "..." : "Reject"}
                        </button>
                      </>
                    )}
                    {entry.status === "approved" && (
                        <button
                          type="button"
                          className="btn primary"
                          onClick={() => patchStatus(entry.id, "return")}
                          disabled={loadingId === entry.id}
                        >
                          <HiOutlineArrowPath />
                          {loadingId === entry.id ? "Processing..." : "Mark as Returned"}
                        </button>
                    )}
                    {entry.status === "returning" && (
                        <button
                          type="button"
                          className="btn success"
                          onClick={() => acceptReturn(entry.id)}
                          disabled={loadingId === entry.id}
                        >
                          <HiOutlineCheckCircle />
                          {loadingId === entry.id ? "Processing..." : "Accept Return & Check Condition"}
                        </button>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {filtered.length === 0 && <p className="muted">No requests found.</p>}
          </div>
        </div>

        {checkingId && (
          <div className="modal-overlay" onClick={() => setCheckingId(null)}>
            <section className="modal-card equipment-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Accept Return & Check Condition</h3>
              </div>
              <div className="form-grid admin-equipment-form">
                <p>Please check the equipment and specify its current condition.</p>

                <div className="return-checklist" style={{ display: "grid", gap: "10px", margin: "10px 0" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "normal" }}>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={checklist.parts}
                      onChange={(e) => setChecklist({ ...checklist, parts: e.target.checked })}
                    />
                    All parts/accessories are present
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "normal" }}>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={checklist.damage}
                      onChange={(e) => setChecklist({ ...checklist, damage: e.target.checked })}
                    />
                    No visible damage (cracks, dents, etc.)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "normal" }}>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={checklist.clean}
                      onChange={(e) => setChecklist({ ...checklist, clean: e.target.checked })}
                    />
                    Equipment is clean
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "normal" }}>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={checklist.functional}
                      onChange={(e) => setChecklist({ ...checklist, functional: e.target.checked })}
                    />
                    Equipment is functional/working
                  </label>
                </div>

                <label>
                  Additional Notes
                  <textarea
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. Good condition, Slightly scratched, Needs repair..."
                  />
                </label>
                <div className="admin-equipment-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setCheckingId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn success"
                    onClick={handleConfirmReturn}
                    disabled={loadingId === checkingId}
                  >
                    {loadingId === checkingId ? "Processing..." : "Confirm & Accept Return"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </AppShell>
    </ProtectedPage>
  );
}
