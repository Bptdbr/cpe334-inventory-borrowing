export function ManageLoansPage() {
  return (
    <div className="page-container" data-testid="manage-loans-page">
      <header className="page-header">
        <h1 className="page-title">Active Loans</h1>
        <p className="page-description">
          Monitor active loans for equipment items you manage.
        </p>
      </header>

      <section className="manage-loans-content">
        <p className="text-muted">
          Active loans will appear here.
        </p>
      </section>
    </div>
  );
}
