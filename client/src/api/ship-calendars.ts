import { apiClient } from "./client";
import type { ShipCalendar } from "@/types";

export const shipCalendarsApi = {
  listByCompany: (companyId: string) =>
    apiClient<ShipCalendar[]>(`/companies/${companyId}/ship-calendars`),

  getById: (id: string) => apiClient<ShipCalendar>(`/ship-calendars/${id}`),

  create: (companyId: string, data: { name: string; active?: boolean }) =>
    apiClient<ShipCalendar>(`/companies/${companyId}/ship-calendars`, {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: { name?: string; active?: boolean }) =>
    apiClient<ShipCalendar>(`/ship-calendars/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/ship-calendars/${id}`, {
      method: "DELETE",
    }),
};
