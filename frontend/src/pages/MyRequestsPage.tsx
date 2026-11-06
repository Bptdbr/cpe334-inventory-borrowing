import { useApiList, formatDate } from "../hooks/useApiList";
import { LoadingState } from "../components/common/LoadingState";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { StatusBadge } from "../components/common/StatusBadge";
import type { MyLoan, MyRequest } from "../types/domain";

export function MyRequestsPage() {
  const loans = useApiList<MyLoan[]>("/api/loans/mine");
  const requests = useApiList<MyRequest[]>("/api/requests/mine");

  const loading = loans.loading || requests.loading;
  const error = loans.error ?? requests.error;
  const reload = () => { void loans.reload(); void requests.reload(); };
  const empty = !!loans.data && !!requests.data && loans.data.length === 0 && requests.data.length === 0;

  return (
    <div className="page-container" data-testid="my-requests-page">
      <header className="page-header">
        <h1 className="page-title">My Requests &amp; Loans</h1>
        <p className="page-description">Track your equipment requests and current active loans.</p>
      </header>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && empty && <EmptyState message="No requests or loans yet" />}
      {!loading && !error && !empty && (
        <>
          <h2 className="section-title">My Active Loans</h2>
          <table className="data-table">
            <thead><tr><th>Asset tag</th><th>Item</th><th>Checked out</th></tr></thead>
            <tbody>
              {loans.data!.map((l) => (
                <tr key={l.id} data-testid={`my-loan-row-${l.item.assetTag}`}>
                  <td>{l.item.assetTag}</td><td>{l.item.name}</td><td>{formatDate(l.checkedOutAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="section-title">My Requests</h2>
          <table className="data-table">
            <thead><tr><th>Asset tag</th><th>Item</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {requests.data!.map((r) => (
                <tr key={r.id} data-testid={`my-request-row-${r.item.assetTag}`}>
                  <td>{r.item.assetTag}</td><td>{r.item.name}</td>
                  <td><StatusBadge status={r.status} testId={`request-status-${r.item.assetTag}`} /></td>
                  <td>{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}