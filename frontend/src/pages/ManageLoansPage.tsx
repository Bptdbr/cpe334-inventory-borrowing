import { formatDate, useApiList } from "../hooks/useApiList";
import { LoadingState } from "../components/common/LoadingState";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { StatusBadge } from "../components/common/StatusBadge";
import type { ManagedLoan } from "../types/domain";

export function ManageLoansPage() {
  const { data, loading, error, reload } = useApiList<ManagedLoan[]>("/api/loans");

  return (
    <div className="page-container" data-testid="manage-loans-page">
      <header className="page-header">
        <h1 className="page-title">Active Loans</h1>
        <p className="page-description">Monitor active loans for equipment items you manage.</p>
      </header>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={() => void reload()} />}
      {!loading && !error && data && data.length === 0 && <EmptyState message="No active loans" />}
      {!loading && !error && data && data.length > 0 && (
        <table className="data-table">
          <thead>
            <tr><th>Asset tag</th><th>Item</th><th>Borrower</th><th>Checked out</th><th>Status</th></tr>
          </thead>
          <tbody>
            {data.map((l) => (
              <tr key={l.id} data-testid={`manage-loan-row-${l.item.assetTag}`}>
                <td>{l.item.assetTag}</td>
                <td>{l.item.name}</td>
                <td>{l.borrower.displayName}</td>
                <td>{formatDate(l.checkedOutAt)}</td>
                <td><StatusBadge status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}