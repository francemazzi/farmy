import { apiClient } from "./client";
import type { DeliverySlot } from "@/types";

export const deliverySlotsApi = {
  listByZone: (deliveryZoneId: string) =>
    apiClient<DeliverySlot[]>(`/zones/${deliveryZoneId}/slots`),

  create: (
    deliveryZoneId: string,
    data: { dayOfWeek: number; cutoffHours?: number },
  ) =>
    apiClient<DeliverySlot>(`/zones/${deliveryZoneId}/slots`, {
      method: "POST",
      body: data,
    }),

  update: (
    id: string,
    data: { dayOfWeek?: number; cutoffHours?: number },
  ) =>
    apiClient<DeliverySlot>(`/slots/${id}`, { method: "PUT", body: data }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/slots/${id}`, { method: "DELETE" }),
};
