import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient, ApiClientError } from "../api/client";
import { errorMessage, useApiList } from "../hooks/useApiList";
import { LoadingState } from "../components/common/LoadingState";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { StatusBadge } from "../components/common/StatusBadge";
import { Feedback } from "../components/common/Feedback";
import type { CatalogItem } from "../types/domain";

export function CatalogPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApiList<CatalogItem[]>("/api/items");
  const [success, setSuccess] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ assetTag: "", name: "", description: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  const isBorrower = user?.role === "BORROWER";
  const isCustodian = user?.role === "CUSTODIAN";

  async function requestItem(item: CatalogItem) {
    setSuccess(null);
    setFailure(null);
    setBusyId(item.id);
    try {
      await apiClient("/api/requests", { method: "POST", body: JSON.stringify({ itemId: item.id }) });
      setSuccess("Request submitted");
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      setBusyId(null);
      await reload();
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setFailure(null);
    setFieldErrors({});
    setAdding(true);
    try {
      await apiClient("/api/items", { method: "POST", body: JSON.stringify(form) });
      setSuccess("Item added");
      setForm({ assetTag: "", name: "", description: "" });
      await reload();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 422 && Array.isArray(err.details)) {
        const next: Record<string, string> = {};
        for (const d of err.details as unknown as Array<{ path?: (string | number)[]; field?: string; message: string }>) {
          next[d.field ?? String(d.path?.[0] ?? "form")] = d.message;
        }
        setFieldErrors(next);
      } else {
        setFailure(errorMessage(err));
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="page-container" data-testid="catalog-page">
      <header className="page-header">
        <h1 className="page-title">Equipment Catalog</h1>
        <p className="page-description">Browse equipment items and their availability.</p>
      </header>

      <Feedback success={success} error={failure} />

      {isCustodian && (
        <form className="inline-form" onSubmit={addItem} noValidate>
          <h2 className="section-title">Add item</h2>
          {(["assetTag", "name", "description"] as const).map((field) => (
            <div className="form-group" key={field}>
              <label className="form-label" htmlFor={`add-${field}`}>
                {field === "assetTag" ? "Asset tag" : field === "name" ? "Name" : "Description"}
              </label>
              <input
                id={`add-${field}`}
                className="form-input"
                value={form[field]}
                data-testid={`add-item-${field === "assetTag" ? "asset-tag" : field}`}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                disabled={adding}
              />
              {fieldErrors[field] && <span className="field-error-text" role="alert">{fieldErrors[field]}</span>}
            </div>
          ))}
          <button type="submit" className="btn btn-primary" disabled={adding} data-testid="add-item-submit">
            {adding ? "Adding..." : "Add item"}
          </button>
        </form>
      )}

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={() => void reload()} />}
      {!loading && !error && data && data.length === 0 && (
        <EmptyState message="No items in the catalog" />
      )}
      {!loading && !error && data && data.length > 0 && (
        <table className="data-table" data-testid="catalog-table">
          <thead>
            <tr>
              <th>Asset tag</th><th>Name</th><th>Description</th><th>Status</th>
              {isBorrower && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} data-testid={`item-row-${item.assetTag}`}>
                <td>{item.assetTag}</td>
                <td>{item.name}</td>
                <td>{item.description}</td>
                <td><StatusBadge status={item.status} testId={`item-status-${item.assetTag}`} /></td>
                {isBorrower && (
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary"
                      data-testid={`request-button-${item.assetTag}`}
                      disabled={item.status !== "AVAILABLE" || busyId === item.id}
                      onClick={() => void requestItem(item)}
                    >
                      {busyId === item.id ? "Requesting..." : "Request"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}