"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ProtectedPage } from "@/components/ProtectedPage";
import { apiFetch } from "@/lib/client/api";
import { formatDate, statusClass } from "@/lib/client/format";
import { HiOutlineCalendarDays } from "react-icons/hi2";

type HistoryRow = {
  id: string;
  date: string;
  equipment: string;
  equipmentImage: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: "pending" | "approved" | "rejected" | "returning" | "returned";
  overdue: boolean;
};

export default function BorrowerHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, active: 0 });

  useEffect(() => {
    apiFetch<{ rows: HistoryRow[]; summary: { total: number; completed: number; active: number } }>(
      "/api/history",
    )
      .then((data) => {
        setRows(data.rows);
        setSummary(data.summary);
      })
      .catch(() => {
        setRows([]);
      });
  }, []);

  return (
    <ProtectedPage role="borrower">
      <AppShell title="History" role="borrower">
        <div className="history-page">
          <section className="history-header">
            <h1>My Borrowing History</h1>
            <p className="muted">View your complete borrowing history</p>
          </section>

          <section className="history-summary-grid">
            <article className="history-summary-card total">
              <h4>Total Requests</h4>
              <strong>{summary.total}</strong>
            </article>
            <article className="history-summary-card active">
              <h4>Total Borrows</h4>
              <strong>{summary.active}</strong>
            </article>
            <article className="history-summary-card completed">
              <h4>Completed Returns</h4>
              <strong>{summary.completed}</strong>
            </article>
          </section>

          <section className="history-panel">
            <h3>Timeline</h3>
            <div className="history-timeline">
              {rows.map((entry) => (
                <article key={entry.id} className="history-row">
                  <span className="history-row-icon">
                    <HiOutlineCalendarDays />
                  </span>
                  <div className="history-row-card">
                    <img src={entry.equipmentImage} alt={entry.equipment} />
                    <div className="history-row-main">
                      <div className="history-row-head">
                        <div>
                          <h4>{entry.equipment}</h4>
                          <p className="muted">Quantity: {entry.quantity}</p>
                        </div>
                        <span className={statusClass(entry.status)}>{entry.status}</span>
                      </div>

                      <div className="history-row-dates">
                        <p>
                          Requested: <strong>{formatDate(entry.date)}</strong>
                        </p>
                        <p>
                          Borrow: <strong>{formatDate(entry.borrowDate)}</strong>
                        </p>
                        <p>
                          Return: <strong>{formatDate(entry.returnDate)}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {rows.length === 0 && <p className="muted">No history records yet.</p>}
            </div>
          </section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
