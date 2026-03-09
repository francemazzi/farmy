import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import type { OrderStatus } from "@/types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "In attesa",
  CONFIRMED: "Confermato",
  PREPARING: "In preparazione",
  SHIPPED: "Spedito",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
};

const STATUS_VARIANTS: Record<
  OrderStatus,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "warning",
  CONFIRMED: "info",
  PREPARING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export function VendorOrdersPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: orders, isLoading } = useQuery({
    queryKey: queryKeys.orders.byCompany(companyId!),
    queryFn: () => ordersApi.listByCompany(companyId!),
    enabled: !!companyId,
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (!statusFilter) return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ordini</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {!orders?.length ? (
        <EmptyState
          icon={<ShoppingCart className="h-12 w-12" />}
          title="Nessun ordine"
          description="Gli ordini dei clienti appariranno qui"
        />
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          Nessun ordine con questo stato
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Link
              key={order.id}
              to={`/vendor/companies/${companyId}/orders/${order.id}`}
            >
              <Card className="group hover:border-primary-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {order.guestName ?? order.customerUser?.name ?? "Cliente"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("it-IT")}
                      {" - "}
                      Consegna:{" "}
                      {new Date(order.deliveryDate).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        STATUS_VARIANTS[order.status as OrderStatus]
                      }
                    >
                      {STATUS_LABELS[order.status as OrderStatus] ??
                        order.status}
                    </Badge>
                    <span className="font-semibold text-gray-900">
                      {order.totalAmount.toFixed(2)} &euro;
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
