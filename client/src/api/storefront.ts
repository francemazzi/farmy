import { apiClient } from "./client";
import type { StorefrontResponse, DeliveryDaysResponse } from "@/types";

export const storefrontApi = {
  get: (companyId: string) =>
    apiClient<StorefrontResponse>(`/storefront/${companyId}`),

  getDeliveryDays: (
    companyId: string,
    params: { zipCode?: string; city?: string },
  ) => {
    const qs = new URLSearchParams();
    if (params.zipCode) qs.set("zipCode", params.zipCode);
    if (params.city) qs.set("city", params.city);
    return apiClient<DeliveryDaysResponse>(
      `/storefront/${companyId}/delivery-days?${qs}`,
    );
  },
};
