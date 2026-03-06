import { Outlet, NavLink, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sprout,
  Building2,
  Warehouse,
  Package,
  FileUp,
  Calendar,
  ShoppingCart,
  Share2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

function SidebarLink({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary-50 text-primary-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}

export function VendorLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { companyId } = useParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const companyBase = companyId ? `/vendor/companies/${companyId}` : null;

  const sidebar = (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      <div className="mb-6 flex items-center gap-3 px-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
          <Sprout className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Farmy</p>
          <p className="text-xs text-gray-500">{user?.name}</p>
        </div>
      </div>

      <SidebarLink
        to="/vendor"
        icon={Building2}
        label="Le mie aziende"
        onClick={() => setMobileOpen(false)}
      />

      {companyBase && (
        <>
          <div className="mt-4 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Gestione
          </div>
          <SidebarLink
            to={companyBase}
            icon={Building2}
            label="Azienda"
            onClick={() => setMobileOpen(false)}
          />
          <SidebarLink
            to={`${companyBase}/warehouses`}
            icon={Warehouse}
            label="Magazzini"
            onClick={() => setMobileOpen(false)}
          />
          <SidebarLink
            to={`${companyBase}/products`}
            icon={Package}
            label="Prodotti"
            onClick={() => setMobileOpen(false)}
          />
          <SidebarLink
            to={`${companyBase}/import`}
            icon={FileUp}
            label="Importa"
            onClick={() => setMobileOpen(false)}
          />
          <SidebarLink
            to={`${companyBase}/calendars`}
            icon={Calendar}
            label="Consegne"
            onClick={() => setMobileOpen(false)}
          />
          <SidebarLink
            to={`${companyBase}/orders`}
            icon={ShoppingCart}
            label="Ordini"
            onClick={() => setMobileOpen(false)}
          />
          <SidebarLink
            to={`${companyBase}/storefront`}
            icon={Share2}
            label="Vetrina"
            onClick={() => setMobileOpen(false)}
          />
        </>
      )}

      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-5 w-5" />
          Esci
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
        {sidebar}
      </aside>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-900">Farmy</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
