import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler } from "../api/client";
import { clearToken, getToken, setToken as persistToken } from "../api/tokenStore";
import { authApi } from "../api/endpoints";
import { decodeStudentToken, isTokenExpired } from "./jwt";

interface CurrentStudent {
  email: string;
}

interface AuthContextValue {
  student: CurrentStudent | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function studentFromToken(token: string | null): CurrentStudent | null {
  if (!token) return null;
  const payload = decodeStudentToken(token);
  if (!payload || isTokenExpired(payload)) return null;
  return { email: payload.email };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<CurrentStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setStudent(null);
    });
    getToken().then((token) => {
      setStudent(studentFromToken(token));
      setIsLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      student,
      isLoading,
      login: async (email: string, password: string) => {
        const { accessToken } = await authApi.login(email, password);
        await persistToken(accessToken);
        setStudent(studentFromToken(accessToken));
      },
      logout: async () => {
        await clearToken();
        setStudent(null);
      },
    }),
    [student, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
