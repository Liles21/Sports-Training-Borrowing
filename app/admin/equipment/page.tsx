"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ProtectedPage } from "@/components/ProtectedPage";
import { apiFetch } from "@/lib/client/api";
import { HiOutlineFunnel, HiOutlinePencil, HiOutlinePlus, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";

type EquipmentItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
  image: string;
  description: string;
};

type EquipmentResponse = {
  equipment: EquipmentItem[];
  categories: string[];
};

const initialForm = {
  name: "",
  category: "",
  quantity: 1,
  image: "",
  description: "",
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
      image: item.image,
      description: item.description,
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
                <img src={item.image} alt={item.name} />
                <div className="equipment-card-body">
                  <div className="equipment-card-head">
                    <div>
                      <h4>{item.name}</h4>
                      <span className="equipment-pill">{item.category}</span>
                    </div>
                    <div className="equipment-card-actions">
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

                  <div className="equipment-metrics">
                    <span>
                      Total: <strong>{item.quantity}</strong>
                    </span>
                    <span>
                      Available: <strong>{item.available}</strong>
                    </span>
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
                  <label>
                    Quantity
                    <input
                      type="number"
                      min={1}
                      value={form.quantity}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))
                      }
                      required
                    />
                  </label>
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
