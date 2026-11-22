import { Link } from "react-router-dom";
import { ErrorState } from "../components/common/ErrorState";

export function NotFoundPage() {
  return (
    <div className="page-container" data-testid="not-found-page">
      <ErrorState
        title="Page Not Found"
        message="This record was not found."
      />
      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <Link to="/items" className="btn btn-primary">
          Back to Catalog
        </Link>
      </div>
    </div>
  );
}
