import { apiClient } from "./client";
import type { User, UserRole } from "@/types";

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
  }) => apiClient<User>("/auth/register", { method: "POST", body: data }),

  login: (data: { email: string; password: string }) =>
    apiClient<User>("/auth/login", { method: "POST", body: data }),

  logout: () =>
    apiClient<{ message: string }>("/auth/logout", { method: "POST" }),

  me: () => apiClient<User>("/auth/me"),
};
