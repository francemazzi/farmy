import { apiClient } from "./client";
import type { Warehouse } from "@/types";

export const warehousesApi = {
  listByCompany: (companyId: string) =>
    apiClient<Warehouse[]>(`/companies/${companyId}/warehouses`),

  getById: (id: string) => apiClient<Warehouse>(`/warehouses/${id}`),

  create: (companyId: string, data: { name: string; address?: string }) =>
    apiClient<Warehouse>(`/companies/${companyId}/warehouses`, {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: { name?: string; address?: string }) =>
    apiClient<Warehouse>(`/warehouses/${id}`, { method: "PUT", body: data }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/warehouses/${id}`, { method: "DELETE" }),
};
