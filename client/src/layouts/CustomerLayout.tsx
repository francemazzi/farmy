import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCartStore } from "@/stores/cart";
import { Sprout, ShoppingCart, ClipboardList, LogOut } from "lucide-react";

export function CustomerLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const totalItems = useCartStore((s) => s.totalItems());

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Farmy</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/my-orders"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              <ClipboardList className="h-5 w-5" />
              <span className="hidden sm:inline">I miei ordini</span>
            </Link>

            {totalItems > 0 && (
              <div className="relative flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700">
                <ShoppingCart className="h-5 w-5" />
                <span>{totalItems}</span>
              </div>
            )}

            <span className="hidden text-sm text-gray-500 sm:inline ml-2">
              {user?.name}
            </span>

            <button
              onClick={handleLogout}
              className="ml-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Esci"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
