import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { session } from "@/lib/api";

const navItems = [
  { to: "/", label: "Planner" },
  { to: "/history", label: "History" },
  { to: "/profile", label: "Profile" },
];

export function AppLayout() {
  const navigate = useNavigate();

  function logout() {
    session.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">EV Route Planner</h1>
              <p className="text-xs text-muted-foreground">Location, traffic, weather and charging support</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Button variant="outline" size="sm" onClick={logout} className="ml-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}
