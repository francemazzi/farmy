import { apiClient } from "./client";
import type { Product } from "@/types";

export const productsApi = {
  listByCompany: (companyId: string) =>
    apiClient<Product[]>(`/companies/${companyId}/products`),

  getById: (id: string) => apiClient<Product>(`/products/${id}`),

  create: (
    companyId: string,
    data: {
      name: string;
      description?: string;
      category?: string;
      unitOfMeasure?: string;
      isOrganic?: boolean;
      producer?: string;
    },
  ) =>
    apiClient<Product>(`/companies/${companyId}/products`, {
      method: "POST",
      body: data,
    }),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      unitOfMeasure?: string;
      isOrganic?: boolean;
      producer?: string;
    },
  ) => apiClient<Product>(`/products/${id}`, { method: "PUT", body: data }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/products/${id}`, { method: "DELETE" }),
};
