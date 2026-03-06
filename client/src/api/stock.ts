import { apiClient } from "./client";
import type { Stock } from "@/types";

export const stockApi = {
  listByWarehouse: (warehouseId: string) =>
    apiClient<Stock[]>(`/warehouses/${warehouseId}/stock`),

  getById: (id: string) => apiClient<Stock>(`/stock/${id}`),

  create: (
    warehouseId: string,
    data: {
      productId: string;
      quantity?: number;
      price: number;
      isNew?: boolean;
      isPromotional?: boolean;
      lowStock?: boolean;
    },
  ) =>
    apiClient<Stock>(`/warehouses/${warehouseId}/stock`, {
      method: "POST",
      body: data,
    }),

  update: (
    id: string,
    data: {
      quantity?: number;
      price?: number;
      isNew?: boolean;
      isPromotional?: boolean;
      lowStock?: boolean;
    },
  ) => apiClient<Stock>(`/stock/${id}`, { method: "PUT", body: data }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/stock/${id}`, { method: "DELETE" }),
};
