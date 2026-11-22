import { useState } from "react";
import { apiClient } from "../api/client";
import { errorMessage, formatDate, useApiList } from "../hooks/useApiList";
import { LoadingState } from "../components/common/LoadingState";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { StatusBadge } from "../components/common/StatusBadge";
import { Feedback } from "../components/common/Feedback";
import type { ManagedRequest } from "../types/domain";

const CHECKOUT_MESSAGES: Record<string, string> = {
  REQUEST_NOT_PENDING: "This request has already been processed",
  ITEM_UNAVAILABLE: "This item is currently unavailable",
};

export function ManageRequestsPage() {
  const { data, loading, error, reload } = useApiList<ManagedRequest[]>("/api/requests");
  const [success, setSuccess] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function checkout(r: ManagedRequest) {
    setSuccess(null);
    setFailure(null);
    setBusyId(r.id);
    try {
      await apiClient(`/api/requests/${r.id}/checkout`, { method: "POST" });
      setSuccess("Checkout recorded");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setFailure(CHECKOUT_MESSAGES[code] ?? errorMessage(err));
    } finally {
      setBusyId(null);
      await reload();
    }
  }

  return (
    <div className="page-container" data-testid="manage-requests-page">
      <header className="page-header">
        <h1 className="page-title">Requests to Process</h1>
        <p className="page-description">Review pending equipment requests and record checkouts.</p>
      </header>

      <Feedback success={success} error={failure} />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={() => void reload()} />}
      {!loading && !error && data && data.length === 0 && <EmptyState message="No requests to process" />}
      {!loading && !error && data && data.length > 0 && (
        <table className="data-table">
          <thead>
            <tr><th>Borrower</th><th>Asset tag</th><th>Item</th><th>Status</th><th>Created</th><th>Action</th></tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} data-testid={`manage-request-row-${r.item.assetTag}`}>
                <td>{r.borrower.displayName}</td>
                <td>{r.item.assetTag}</td>
                <td>{r.item.name}</td>
                <td><StatusBadge status={r.status} testId={`request-status-${r.item.assetTag}`} /></td>
                <td>{formatDate(r.createdAt)}</td>
                <td>
                  {r.status === "PENDING" && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      data-testid={`checkout-button-${r.item.assetTag}`}
                      disabled={busyId === r.id}
                      onClick={() => void checkout(r)}
                    >
                      {busyId === r.id ? "Checking out..." : "Check out"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}