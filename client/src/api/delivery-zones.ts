import { apiClient } from "./client";
import type { DeliveryZone } from "@/types";

export const deliveryZonesApi = {
  listByCalendar: (shipCalendarId: string) =>
    apiClient<DeliveryZone[]>(
      `/ship-calendars/${shipCalendarId}/zones`,
    ),

  getById: (id: string) => apiClient<DeliveryZone>(`/zones/${id}`),

  create: (
    shipCalendarId: string,
    data: { name: string; zipCodes?: string; cities?: string },
  ) =>
    apiClient<DeliveryZone>(
      `/ship-calendars/${shipCalendarId}/zones`,
      { method: "POST", body: data },
    ),

  update: (
    id: string,
    data: { name?: string; zipCodes?: string; cities?: string },
  ) =>
    apiClient<DeliveryZone>(`/zones/${id}`, { method: "PUT", body: data }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/zones/${id}`, { method: "DELETE" }),
};
