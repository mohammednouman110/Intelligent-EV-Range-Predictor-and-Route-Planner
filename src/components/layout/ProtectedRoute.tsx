import { Navigate, Outlet } from "react-router-dom";
import { session } from "@/lib/api";

export function ProtectedRoute() {
  // JWT in localStorage is the source of truth now; the phone/email is just a UI hint.
  if (!session.getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
