"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ProtectedPage } from "@/components/ProtectedPage";
import { apiFetch } from "@/lib/client/api";
import { formatDate, statusClass } from "@/lib/client/format";
import { HiOutlineArrowDownTray } from "react-icons/hi2";

type HistoryRow = {
  id: string;
  date: string;
  borrower: string;
  equipment: string;
  equipmentImage: string;
  category: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: "pending" | "approved" | "rejected" | "returned";
  overdue: boolean;
};

export default function AdminHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, active: 0 });
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiFetch<{ rows: HistoryRow[]; summary: { total: number; completed: number; active: number } }>(
      "/api/history",
    )
      .then((data) => {
        setRows(data.rows);
        setSummary(data.summary);
      })
      .catch(() => setRows([]));
  }, []);

  const filtered = rows.filter((entry) => {
    const term = query.toLowerCase();
    return (
      entry.borrower.toLowerCase().includes(term) ||
      entry.equipment.toLowerCase().includes(term)
    );
  });

  function exportCsv() {
    window.open("/api/history?format=csv", "_blank");
  }

  return (
    <ProtectedPage role="admin">
      <AppShell title="Transaction History" role="admin">
        <div className="history-page admin-history-page">
          <section className="history-header admin-history-header">
            <div>
              <h1>Borrowing History</h1>
              <p className="muted">Complete history of all borrowing transactions</p>
            </div>
            <button type="button" className="btn primary admin-history-export" onClick={exportCsv}>
              <HiOutlineArrowDownTray />
              Export CSV
            </button>
          </section>

          <section className="history-summary-grid admin-history-summary-grid">
            <article className="history-summary-card total">
              <h4>Total Transactions</h4>
              <strong>{summary.total}</strong>
            </article>
            <article className="history-summary-card completed">
              <h4>Completed Returns</h4>
              <strong>{summary.completed}</strong>
            </article>
            <article className="history-summary-card active">
              <h4>Active Borrows</h4>
              <strong>{summary.active}</strong>
            </article>
          </section>

          <section className="history-panel admin-history-search-panel">
            <input
              placeholder="Search by borrower name or equipment..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </section>

          <section className="history-panel admin-history-table-panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Borrower</th>
                    <th>Equipment</th>
                    <th>Quantity</th>
                    <th>Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.date)}</td>
                      <td>{entry.borrower}</td>
                      <td>
                        <div className="admin-history-equipment-cell">
                          <img src={entry.equipmentImage} alt={entry.equipment} />
                          <div>
                            <p className="admin-history-equipment-name">{entry.equipment}</p>
                            <p className="muted">{entry.category}</p>
                          </div>
                        </div>
                      </td>
                      <td>{entry.quantity}</td>
                      <td>{formatDate(entry.borrowDate)} - {formatDate(entry.returnDate)}</td>
                      <td><span className={statusClass(entry.status)}>{entry.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
