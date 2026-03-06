import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { queryKeys } from "@/lib/query-keys";
import type { User, UserRole } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login({ email, password });
      queryClient.setQueryData(queryKeys.auth.me, result);
      return result;
    },
    [queryClient],
  );

  const register = useCallback(
    async (email: string, password: string, name: string, role: UserRole) => {
      await authApi.register({ email, password, name, role });
      return login(email, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    queryClient.setQueryData(queryKeys.auth.me, null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
