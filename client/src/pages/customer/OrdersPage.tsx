import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList, ChevronRight } from "lucide-react";
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

export function CustomerOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: queryKeys.orders.my,
    queryFn: ordersApi.listMy,
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">I miei ordini</h1>

      {!orders?.length ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="Nessun ordine"
          description="Non hai ancora effettuato nessun ordine"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} to={`/my-orders/${order.id}`}>
              <Card className="group hover:border-primary-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {order.company?.name ?? "Ordine"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("it-IT")}
                      {" - "}
                      Consegna:{" "}
                      {new Date(order.deliveryDate).toLocaleDateString("it-IT")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.items?.length ?? 0} prodotti
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
