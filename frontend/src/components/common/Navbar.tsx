import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="navbar-container" role="banner">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <NavLink to="/items" className="brand-link">
            Equipment Inventory &amp; Borrowing
          </NavLink>
        </div>

        {user && (
          <nav className="navbar-nav" aria-label="Main Navigation">
            <ul className="nav-list">
              <li>
                <NavLink
                  to="/items"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Catalog
                </NavLink>
              </li>

              {user.role === "BORROWER" && (
                <li>
                  <NavLink
                    to="/my"
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                  >
                    My Requests &amp; Loans
                  </NavLink>
                </li>
              )}

              {user.role === "CUSTODIAN" && (
                <>
                  <li>
                    <NavLink
                      to="/manage/requests"
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                    >
                      Requests to Process
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/manage/loans"
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                    >
                      Active Loans
                    </NavLink>
                  </li>
                </>
              )}
            </ul>

            <div className="navbar-user">
              <span className="user-info">
                <span className="user-name" data-testid="user-display-name">
                  {user.displayName}
                </span>
                <span
                  className="user-role-badge"
                  data-testid="user-role-badge"
                  aria-label={`Role: ${user.role}`}
                >
                  ({user.role === "BORROWER" ? "Borrower" : "Custodian"})
                </span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-logout"
                data-testid="logout-button"
              >
                Log out
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
