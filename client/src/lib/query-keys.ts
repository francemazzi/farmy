export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  companies: {
    all: ["companies"] as const,
    detail: (id: string) => ["companies", id] as const,
  },
  warehouses: {
    byCompany: (companyId: string) => ["warehouses", companyId] as const,
    detail: (id: string) => ["warehouses", "detail", id] as const,
  },
  products: {
    byCompany: (companyId: string) => ["products", companyId] as const,
    detail: (id: string) => ["products", "detail", id] as const,
  },
  stock: {
    byWarehouse: (warehouseId: string) => ["stock", warehouseId] as const,
  },
  storefront: {
    products: (companyId: string) => ["storefront", companyId] as const,
    deliveryDays: (companyId: string, zipCode?: string, city?: string) =>
      ["storefront", companyId, "delivery-days", { zipCode, city }] as const,
  },
  shipCalendars: {
    byCompany: (companyId: string) =>
      ["ship-calendars", companyId] as const,
    detail: (id: string) => ["ship-calendars", "detail", id] as const,
  },
  deliveryZones: {
    byCalendar: (calendarId: string) =>
      ["delivery-zones", calendarId] as const,
    detail: (id: string) => ["delivery-zones", "detail", id] as const,
  },
  deliverySlots: {
    byZone: (zoneId: string) => ["delivery-slots", zoneId] as const,
  },
  orders: {
    my: ["orders", "my"] as const,
    byCompany: (companyId: string) =>
      ["orders", "company", companyId] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
  },
};
