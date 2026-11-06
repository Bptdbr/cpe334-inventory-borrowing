import { useAuth } from "../context/AuthContext";

export function CatalogPage() {
  const { user } = useAuth();

  return (
    <div className="page-container" data-testid="catalog-page">
      <header className="page-header">
        <h1 className="page-title">Equipment Catalog</h1>
        <p className="page-description">
          Browse available equipment items.
        </p>
      </header>

      <section className="catalog-content">
        <p>
          Logged in as <strong>{user?.displayName}</strong> ({user?.role}).
        </p>
        <p className="text-muted">
          Catalog items will be listed here.
        </p>
      </section>
    </div>
  );
}
