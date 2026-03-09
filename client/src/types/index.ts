export type UserRole = "VENDITORE" | "CLIENTE";
export type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type PaymentMethod = "CASH";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  warehouses?: Warehouse[];
  products?: Product[];
  _count?: { warehouses: number; products: number };
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  stocks?: Stock[];
  _count?: { stocks: number };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure?: string;
  isOrganic: boolean;
  producer?: string;
  imageUrl?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  stocks?: Stock[];
}

export interface Stock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  price: number;
  isNew: boolean;
  isPromotional: boolean;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  warehouse?: Warehouse;
}

export interface ImportLog {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  error?: string;
  companyId: string;
  userId: string;
  createdAt: string;
}

export interface ShipCalendar {
  id: string;
  name: string;
  active: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  deliveryZones?: DeliveryZone[];
  _count?: { deliveryZones: number };
}

export interface DeliveryZone {
  id: string;
  name: string;
  zipCodes: string;
  cities: string;
  shipCalendarId: string;
  createdAt: string;
  updatedAt: string;
  shipCalendar?: ShipCalendar;
  deliverySlots?: DeliverySlot[];
  _count?: { deliverySlots: number };
}

export interface DeliverySlot {
  id: string;
  dayOfWeek: number;
  cutoffHours: number;
  deliveryZoneId: string;
  createdAt: string;
  updatedAt: string;
  deliveryZone?: DeliveryZone;
}

export interface Order {
  id: string;
  companyId: string;
  customerUserId?: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryDate: string;
  deliveryZoneId?: string;
  totalAmount: number;
  notes?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestAddress?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  customerUser?: User;
  company?: Company;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  stockId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: Product;
}

export interface CreateOrderPayload {
  companyId: string;
  deliveryDate: string;
  deliveryZoneId?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: Array<{
    productId: string;
    stockId: string;
    quantity: number;
  }>;
}

export interface StorefrontProduct extends Product {
  stocks: Array<Stock & { warehouse: { name: string } }>;
}

export interface StorefrontResponse {
  company: Pick<Company, "id" | "name" | "description">;
  products: StorefrontProduct[];
}

export interface DeliveryDay {
  dayOfWeek: number;
  dayName: string;
  cutoffHours: number;
}

export interface DeliveryDaysZone {
  zoneId: string;
  zoneName: string;
  calendarName: string;
  days: DeliveryDay[];
}

export interface DeliveryDaysResponse {
  zones: DeliveryDaysZone[];
}
