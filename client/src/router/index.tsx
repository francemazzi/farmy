import { createBrowserRouter } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { VendorLayout } from "@/layouts/VendorLayout";
import { CustomerLayout } from "@/layouts/CustomerLayout";
import { RequireAuth, RequireVenditore } from "@/router/guards";

import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SetupPage } from "@/pages/SetupPage";
import { SetupRedirect } from "@/router/SetupRedirect";

// Vendor pages
import { DashboardPage } from "@/pages/vendor/DashboardPage";
import { CompanyDetailPage } from "@/pages/vendor/CompanyDetailPage";
import { WarehousesPage } from "@/pages/vendor/WarehousesPage";
import { WarehouseDetailPage } from "@/pages/vendor/WarehouseDetailPage";
import { ProductsPage } from "@/pages/vendor/ProductsPage";
import { ProductDetailPage as VendorProductDetailPage } from "@/pages/vendor/ProductDetailPage";
import { ImportPage } from "@/pages/vendor/ImportPage";
import { ShipCalendarsPage } from "@/pages/vendor/ShipCalendarsPage";
import { ShipCalendarDetailPage } from "@/pages/vendor/ShipCalendarDetailPage";
import { DeliveryZoneDetailPage } from "@/pages/vendor/DeliveryZoneDetailPage";
import { VendorOrdersPage } from "@/pages/vendor/OrdersPage";
import { VendorOrderDetailPage } from "@/pages/vendor/OrderDetailPage";
import { StorefrontSharePage } from "@/pages/vendor/StorefrontSharePage";

// Customer pages
import { StorefrontPage } from "@/pages/customer/StorefrontPage";
import { CustomerProductDetailPage } from "@/pages/customer/ProductDetailPage";
import { CheckoutPage } from "@/pages/customer/CheckoutPage";
import { CustomerOrdersPage } from "@/pages/customer/OrdersPage";
import { CustomerOrderDetailPage } from "@/pages/customer/OrderDetailPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <SetupRedirect />,
  },

  // Setup (primo avvio)
  { path: "/setup", element: <SetupPage /> },

  // Auth
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },

  // Vendor
  {
    element: (
      <RequireVenditore>
        <VendorLayout />
      </RequireVenditore>
    ),
    children: [
      { path: "/vendor", element: <DashboardPage /> },
      {
        path: "/vendor/companies/:companyId",
        element: <CompanyDetailPage />,
      },
      {
        path: "/vendor/companies/:companyId/warehouses",
        element: <WarehousesPage />,
      },
      {
        path: "/vendor/companies/:companyId/warehouses/:id",
        element: <WarehouseDetailPage />,
      },
      {
        path: "/vendor/companies/:companyId/products",
        element: <ProductsPage />,
      },
      {
        path: "/vendor/companies/:companyId/products/:id",
        element: <VendorProductDetailPage />,
      },
      {
        path: "/vendor/companies/:companyId/import",
        element: <ImportPage />,
      },
      {
        path: "/vendor/companies/:companyId/calendars",
        element: <ShipCalendarsPage />,
      },
      {
        path: "/vendor/companies/:companyId/calendars/:calId",
        element: <ShipCalendarDetailPage />,
      },
      {
        path: "/vendor/companies/:companyId/calendars/:calId/zones/:zoneId",
        element: <DeliveryZoneDetailPage />,
      },
      {
        path: "/vendor/companies/:companyId/orders",
        element: <VendorOrdersPage />,
      },
      {
        path: "/vendor/companies/:companyId/orders/:orderId",
        element: <VendorOrderDetailPage />,
      },
      {
        path: "/vendor/companies/:companyId/storefront",
        element: <StorefrontSharePage />,
      },
    ],
  },

  // Customer storefront
  {
    element: (
      <RequireAuth>
        <CustomerLayout />
      </RequireAuth>
    ),
    children: [
      { path: "/store/:companyId", element: <StorefrontPage /> },
      {
        path: "/store/:companyId/product/:id",
        element: <CustomerProductDetailPage />,
      },
      { path: "/store/:companyId/checkout", element: <CheckoutPage /> },
      { path: "/my-orders", element: <CustomerOrdersPage /> },
      { path: "/my-orders/:orderId", element: <CustomerOrderDetailPage /> },
    ],
  },

  // 404
  { path: "*", element: <NotFoundPage /> },
]);
