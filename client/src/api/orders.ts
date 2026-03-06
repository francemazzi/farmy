import { apiClient } from "./client";
import type { Order, CreateOrderPayload } from "@/types";

export const ordersApi = {
  create: (data: CreateOrderPayload) =>
    apiClient<Order>("/orders", { method: "POST", body: data }),

  listMy: () => apiClient<Order[]>("/orders/my"),

  listByCompany: (companyId: string) =>
    apiClient<Order[]>(`/companies/${companyId}/orders`),

  getById: (id: string) => apiClient<Order>(`/orders/${id}`),

  update: (
    id: string,
    data: {
      status?: string;
      notes?: string;
      items?: Array<{
        productId: string;
        stockId: string;
        quantity: number;
      }>;
    },
  ) => apiClient<Order>(`/orders/${id}`, { method: "PUT", body: data }),

  cancel: (id: string) =>
    apiClient<{ message: string }>(`/orders/${id}/cancel`, {
      method: "DELETE",
    }),
};
