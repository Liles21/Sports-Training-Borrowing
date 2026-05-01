"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ProtectedPage } from "@/components/ProtectedPage";
import { apiFetch } from "@/lib/client/api";
import {
  HiOutlineShoppingCart,
  HiOutlineXCircle,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from "react-icons/hi2";

type EquipmentItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
  image: string;
  description: string;
  status?: string;
};

type EquipmentResponse = {
  equipment: EquipmentItem[];
  categories: string[];
};

export default function BorrowerEquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<EquipmentItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));

  async function loadEquipment() {
    const data = await apiFetch<EquipmentResponse>("/api/equipment");
    setItems(data.equipment);
    setCategories(data.categories);
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await loadEquipment();
      } catch {
        if (active) {
          setError("Unable to load equipment.");
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return items.filter((item) => {
      const byCategory = category === "all" || item.category === category;
      const bySearch =
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term);

      return byCategory && bySearch;
    });
  }, [category, items, query]);

  async function submitBorrow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    setError(null);
    setMessage(null);

    try {
      await apiFetch<{ message: string }>("/api/borrow-requests", {
        method: "POST",
        body: JSON.stringify({
          equipmentId: selected.id,
          quantity,
          borrowDate,
          returnDate,
        }),
      });
      setMessage("Borrow request submitted.");
      setSelected(null);
      await loadEquipment();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit request.");
    }
  }

  return (
    <ProtectedPage role="borrower">
      <AppShell title="Equipment" role="borrower">
        <div className="equipment-page">
          <section className="equipment-header">
            <div>
              <h1>Available Equipment</h1>
              <p className="muted">Browse and request to borrow gym equipment</p>
            </div>
          </section>

          <section className="equipment-toolbar">
            <div className="search-field">
              <input
                placeholder="Search equipment..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="select-field">
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All</option>
                {categories.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {message && <p className="alert success">{message}</p>}
          {error && <p className="alert error">{error}</p>}

          <div className="equipment-grid">
            {filtered.map((item) => (
              <article key={item.id} className="equipment-card">
                <div className="equipment-image-container">
                  <img src={item.image} alt={item.name} />
                  <div className="equipment-badges">
                    <span className="badge category">{item.category}</span>
                    {item.status === 'borrowed' || item.available < 1 ? (
                      <span className="badge borrowed">
                        <HiOutlineExclamationCircle /> Borrowed
                      </span>
                    ) : (
                      <span className="badge available">
                        <HiOutlineCheckCircle /> Available
                      </span>
                    )}
                  </div>
                </div>
                  <div className="equipment-copy">
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <div className="equipment-metrics-grid">
                      <div className="metric-box">
                        <span className="metric-label">Total Quantity</span>
                        <span className="metric-value">{item.quantity}</span>
                      </div>
                      <div className="metric-box">
                        <span className="metric-label">Available Qty</span>
                        <span className="metric-value">{item.available}</span>
                      </div>
                    </div>
                  </div>
                <button
                  type="button"
                  className="btn primary"
                  disabled={item.available < 1}
                  onClick={() => {
                    setSelected(item);
                    setQuantity(1);
                  }}
                >
                  {item.available < 1 ? (
                    <>
                      <HiOutlineXCircle />
                      Unavailable
                    </>
                  ) : (
                    <>
                      <HiOutlineShoppingCart />
                      Request Borrow
                    </>
                  )}
                </button>
              </article>
            ))}
          </div>
        </div>

        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <section className="modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="modal-head">
                <h3>Borrow {selected.name}</h3>
                <button type="button" className="icon-button" onClick={() => setSelected(null)}>
                  <HiOutlineXMark />
                </button>
              </div>

              <form className="form-grid" onSubmit={submitBorrow}>
                <label>
                  Quantity
                  <input
                    type="number"
                    min={1}
                    max={Math.max(selected.available, 1)}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    required
                  />
                </label>

                <label>
                  Borrow Date
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={borrowDate}
                    onChange={(event) => setBorrowDate(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Return Date
                  <input
                    type="date"
                    min={borrowDate}
                    value={returnDate}
                    onChange={(event) => setReturnDate(event.target.value)}
                    required
                  />
                </label>

                <button type="submit" className="btn primary">Submit Request</button>
              </form>
            </section>
          </div>
        )}
      </AppShell>
    </ProtectedPage>
  );
}
