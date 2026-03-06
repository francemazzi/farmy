import { apiClient } from "./client";
import type { Company } from "@/types";

export const companiesApi = {
  list: () => apiClient<Company[]>("/companies"),

  getById: (id: string) => apiClient<Company>(`/companies/${id}`),

  create: (data: { name: string; description?: string }) =>
    apiClient<Company>("/companies", { method: "POST", body: data }),

  update: (id: string, data: { name?: string; description?: string }) =>
    apiClient<Company>(`/companies/${id}`, { method: "PUT", body: data }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/companies/${id}`, { method: "DELETE" }),
};
