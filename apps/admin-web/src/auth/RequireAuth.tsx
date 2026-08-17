import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth() {
  const { admin } = useAuth();
  if (!admin) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
