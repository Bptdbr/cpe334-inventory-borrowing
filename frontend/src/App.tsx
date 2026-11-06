import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/common/Navbar";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { CatalogPage } from "./pages/CatalogPage";
import { MyRequestsPage } from "./pages/MyRequestsPage";
import { ManageRequestsPage } from "./pages/ManageRequestsPage";
import { ManageLoansPage } from "./pages/ManageLoansPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-layout">
          <Navbar />
          <main className="content-container" role="main">
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute allowedRoles={["BORROWER", "CUSTODIAN"]} />}>
                <Route path="/items" element={<CatalogPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["BORROWER"]} />}>
                <Route path="/my" element={<MyRequestsPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["CUSTODIAN"]} />}>
                <Route path="/manage/requests" element={<ManageRequestsPage />} />
                <Route path="/manage/loans" element={<ManageLoansPage />} />
              </Route>

              {/* Default redirects */}
              <Route path="/" element={<Navigate to="/items" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
