import React from "react";
import { Navigate, Outlet, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="content-container">
        <LoadingState message="Checking session..." />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <main className="content-container" data-testid="forbidden-screen">
        <ErrorState
          title="Access Forbidden"
          message="You are not allowed to do this."
        />
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link to="/items" className="btn btn-primary">
            Back to Catalog
          </Link>
        </div>
      </main>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
