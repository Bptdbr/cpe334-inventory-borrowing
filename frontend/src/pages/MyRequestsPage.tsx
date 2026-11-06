export function MyRequestsPage() {
  return (
    <div className="page-container" data-testid="my-requests-page">
      <header className="page-header">
        <h1 className="page-title">My Requests &amp; Loans</h1>
        <p className="page-description">
          Track your equipment requests and current active loans.
        </p>
      </header>

      <section className="my-content">
        <p className="text-muted">
          Your requests and loans will appear here.
        </p>
      </section>
    </div>
  );
}
