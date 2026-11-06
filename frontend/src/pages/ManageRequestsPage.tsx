export function ManageRequestsPage() {
  return (
    <div className="page-container" data-testid="manage-requests-page">
      <header className="page-header">
        <h1 className="page-title">Requests to Process</h1>
        <p className="page-description">
          Review pending equipment requests and record checkouts.
        </p>
      </header>

      <section className="manage-requests-content">
        <p className="text-muted">
          Pending requests for your managed items will appear here.
        </p>
      </section>
    </div>
  );
}
