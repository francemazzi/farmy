import { apiClient } from "./client";

export const importApi = {
  upload: (companyId: string, warehouseId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<{
      importLogId: string;
      productsCreated: number;
      productsUpdated: number;
      productsUnchanged: number;
    }>(
      `/import/upload?companyId=${companyId}&warehouseId=${warehouseId}`,
      { method: "POST", body: formData },
    );
  },
};
