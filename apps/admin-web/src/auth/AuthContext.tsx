import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AdminRole } from "@school-voting/shared";
import { clearToken, getToken, setToken, setUnauthorizedHandler } from "../api/client";
import { authApi } from "../api/endpoints";
import { decodeAdminToken, isTokenExpired } from "./jwt";

interface CurrentAdmin {
  email: string;
  role: AdminRole;
}

interface AuthContextValue {
  admin: CurrentAdmin | null;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function adminFromToken(token: string | null): CurrentAdmin | null {
  if (!token) return null;
  const payload = decodeAdminToken(token);
  if (!payload || isTokenExpired(payload)) return null;
  return { email: payload.email, role: payload.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<CurrentAdmin | null>(() => adminFromToken(getToken()));

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setAdmin(null);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      isSuperAdmin: admin?.role === AdminRole.SUPER_ADMIN,
      login: async (email: string, password: string) => {
        const { accessToken } = await authApi.login(email, password);
        setToken(accessToken);
        setAdmin(adminFromToken(accessToken));
      },
      logout: () => {
        clearToken();
        setAdmin(null);
      },
    }),
    [admin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
