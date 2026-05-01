"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ProtectedPage } from "@/components/ProtectedPage";
import { apiFetch } from "@/lib/client/api";
import { HiOutlineFunnel, HiOutlinePencil, HiOutlinePlus, HiOutlineTrash, HiOutlineXMark, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlinePlusCircle } from "react-icons/hi2";

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

const initialForm = {
  name: "",
  category: "",
  quantity: 1,
  available: 1,
  image: "",
  description: "",
  status: "available",
};

export default function AdminEquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<EquipmentResponse>("/api/equipment");
    setItems(data.equipment);
    setCategories(data.categories);
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await load();
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
      const byCategory = categoryFilter === "all" || item.category === categoryFilter;
      const bySearch =
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term);
      return byCategory && bySearch;
    });
  }, [categoryFilter, items, query]);

  const categoryOptions = useMemo(() => {
    const unique = new Set(categories);
    if (form.category) {
      unique.add(form.category);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [categories, form.category]);

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const body = {
      ...form,
      quantity: Number(form.quantity),
    };

    try {
      if (editingId) {
        await apiFetch<{ equipment: EquipmentItem[] }>(`/api/equipment/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setMessage("Equipment updated.");
      } else {
        await apiFetch<{ equipment: EquipmentItem[] }>("/api/equipment", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setMessage("Equipment added.");
      }

      setForm(initialForm);
      setEditingId(null);
      setIsFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save equipment.");
    }
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(initialForm);
    setMessage(null);
    setError(null);
    setIsFormOpen(true);
  }

  function openEditForm(item: EquipmentItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      available: item.available,
      image: item.image,
      description: item.description,
      status: item.status ?? "available",
    });
    setMessage(null);
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
  }

  function onCategorySelect(value: string) {
    if (value === "__new__") {
      const created = window.prompt("Enter a new category");
      const next = (created ?? "").trim();
      if (!next) {
        return;
      }

      setCategories((prev) => (prev.includes(next) ? prev : [...prev, next]));
      setForm((prev) => ({ ...prev, category: next }));
      return;
    }

    setForm((prev) => ({ ...prev, category: value }));
  }

  async function removeEquipment(id: string) {
    if (!window.confirm("Delete this equipment item?")) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await apiFetch<{ message: string }>(`/api/equipment/${id}`, {
        method: "DELETE",
      });
      setMessage("Equipment deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete equipment.");
    }
  }

  async function handleRestock(item: EquipmentItem) {
    const amountStr = window.prompt(`How many ${item.name}s do you want to restock?`);
    if (!amountStr) return;

    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      window.alert("Please enter a valid positive number.");
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const body = {
        name: item.name,
        category: item.category,
        quantity: item.quantity + amount,
        image: item.image,
        description: item.description,
        status: item.status,
      };

      await apiFetch<{ equipment: EquipmentItem[] }>(`/api/equipment/${item.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setMessage(`Successfully restocked ${amount} ${item.name}(s).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to restock equipment.");
    }
  }

  return (
    <ProtectedPage role="admin">
      <AppShell title="Equipment Management" role="admin">
        <div className="equipment-page admin-equipment-page">
          <section className="equipment-header admin-equipment-header">
            <div>
              <h1>Equipment Management</h1>
              <p className="muted">Add, edit, or remove equipment from inventory</p>
            </div>

            <button type="button" className="btn primary equipment-action" onClick={openCreateForm}>
              <HiOutlinePlus />
              Add Equipment
            </button>
          </section>

          <section className="equipment-toolbar admin-equipment-toolbar">
            <div className="search-field equipment-search-field">
              <input
                placeholder="Search equipment by name, description, or category..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="equipment-filter-wrap">
              <HiOutlineFunnel />
              <select
                value={categoryFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategoryFilter(value);
                  if (value === "all") {
                    setQuery("");
                  }
                }}
              >
                <option value="all">All</option>
                {categories.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </div>
          </section>

          <div className="equipment-grid admin-equipment-grid">
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
                <div className="equipment-card-body">
                  <div className="equipment-card-head">
                    <div>
                      <h4>{item.name}</h4>
                    </div>
                    <div className="equipment-card-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleRestock(item)}
                        title="Restock"
                        aria-label={`Restock ${item.name}`}
                      >
                        <HiOutlinePlusCircle />
                      </button>
                      <button
                        type="button"
                        className="icon-btn edit"
                        onClick={() => openEditForm(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <HiOutlinePencil />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => removeEquipment(item.id)}
                        aria-label={`Delete ${item.name}`}
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </div>

                  <p className="equipment-description">{item.description}</p>

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
              </article>
            ))}
          </div>

          {isFormOpen && (
            <div className="modal-overlay" onClick={closeForm} role="presentation">
              <div className="modal-card equipment-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-head">
                  <h3>{editingId ? "Edit Equipment" : "Add Equipment"}</h3>
                  <button type="button" className="modal-close" onClick={closeForm} aria-label="Close form">
                    <HiOutlineXMark />
                  </button>
                </div>

                <form className="form-grid admin-equipment-form" onSubmit={submitForm}>
                  <label>
                    Name
                    <input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={form.category}
                      onChange={(event) => onCategorySelect(event.target.value)}
                      required
                    >
                      <option value="">Select a category</option>
                      {categoryOptions.map((entry) => (
                        <option key={entry} value={entry}>{entry}</option>
                      ))}
                      <option value="__new__">+ Add New Category</option>
                    </select>
                  </label>
                  <div className="form-row-2col-qty">
                    <label>
                      TOTAL QUANTITY
                      <input
                        type="number"
                        min={0}
                        value={form.quantity}
                        onChange={(event) => {
                          const newQuantity = Number(event.target.value);
                          setForm((prev) => {
                            if (editingId) {
                              const originalItem = items.find(i => i.id === editingId);
                              if (originalItem) {
                                const borrowed = originalItem.quantity - originalItem.available;
                                return { ...prev, quantity: newQuantity, available: Math.max(0, newQuantity - borrowed) };
                              }
                            }
                            return { ...prev, quantity: newQuantity, available: newQuantity };
                          });
                        }}
                        required
                      />
                    </label>
                    <label>
                      AVAILABLE QTY
                      <input
                        type="number"
                        min={0}
                        value={form.available}
                        onChange={(event) => {
                          const newAvailable = Number(event.target.value);
                          setForm((prev) => {
                            if (editingId) {
                              const originalItem = items.find(i => i.id === editingId);
                              if (originalItem) {
                                const borrowed = originalItem.quantity - originalItem.available;
                                return { ...prev, available: newAvailable, quantity: newAvailable + borrowed };
                              }
                            }
                            return { ...prev, available: newAvailable, quantity: newAvailable };
                          });
                        }}
                        title="Edit available quantity to automatically update total quantity."
                      />
                    </label>
                  </div>
                  <label>
                    Description
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      required
                    />
                  </label>

                  <label>
                    Image URL
                    <input
                      value={form.image}
                      placeholder="https://example.com/image.jpg"
                      onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
                      required
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={form.status}
                      onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                      required
                    >
                      <option value="available">Available</option>
                      <option value="borrowed">Borrowed</option>
                    </select>
                  </label>

                  <div className="button-row admin-equipment-actions">
                    <button type="button" className="btn ghost" onClick={closeForm}>
                      Cancel
                    </button>
                    <button type="submit" className="btn primary">
                      {editingId ? "Save" : "Add"}
                    </button>
                  </div>
                </form>

                {message && <p className="alert success">{message}</p>}
                {error && <p className="alert error">{error}</p>}
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
