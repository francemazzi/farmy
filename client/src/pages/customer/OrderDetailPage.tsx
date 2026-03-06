import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { differenceInDays, parseISO } from "date-fns";
import type { OrderStatus } from "@/types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "In attesa",
  CONFIRMED: "Confermato",
  PREPARING: "In preparazione",
  SHIPPED: "Spedito",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
};

export function CustomerOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: queryKeys.orders.detail(orderId!),
    queryFn: () => ordersApi.getById(orderId!),
    enabled: !!orderId,
  });

  const canModify = (() => {
    if (!order) return false;
    if (order.status !== "PENDING" && order.status !== "CONFIRMED")
      return false;
    const daysUntilDelivery = differenceInDays(
      parseISO(order.deliveryDate),
      new Date(),
    );
    return daysUntilDelivery >= 2;
  })();

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await ordersApi.cancel(orderId!);
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId!),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.my });
      toast("success", "Ordine annullato");
      setShowCancel(false);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) return <PageSpinner />;
  if (!order) return <p className="text-gray-500">Ordine non trovato</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate("/my-orders")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        I miei ordini
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Ordine #{order.id.slice(-6)}
        </h1>
        <Badge
          variant={
            order.status === "CANCELLED"
              ? "danger"
              : order.status === "DELIVERED"
                ? "success"
                : "warning"
          }
        >
          {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
        </Badge>
      </div>

      <div className="space-y-4">
        <Card>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Azienda</dt>
              <dd className="font-medium">{order.company?.name ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Data ordine</dt>
              <dd>
                {new Date(order.createdAt).toLocaleDateString("it-IT")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Consegna</dt>
              <dd className="font-medium">
                {new Date(order.deliveryDate).toLocaleDateString("it-IT")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Pagamento</dt>
              <dd>
                {order.paymentMethod === "CASH"
                  ? "Contanti alla consegna"
                  : order.paymentMethod}
              </dd>
            </div>
            {order.notes && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Note</dt>
                <dd>{order.notes}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase">
            Prodotti
          </h2>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {item.product?.name ?? item.productId}
                  </p>
                  <p className="text-gray-500">
                    {item.quantity} x {item.unitPrice.toFixed(2)} &euro;
                  </p>
                </div>
                <span className="font-semibold">
                  {item.totalPrice.toFixed(2)} &euro;
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t pt-3">
            <span className="font-bold text-gray-900">Totale</span>
            <span className="font-bold text-gray-900">
              {order.totalAmount.toFixed(2)} &euro;
            </span>
          </div>
        </Card>

        {canModify && (
          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={() => setShowCancel(true)}
              className="w-full"
            >
              Annulla ordine
            </Button>
          </div>
        )}

        {!canModify &&
          order.status !== "CANCELLED" &&
          order.status !== "DELIVERED" && (
            <p className="text-center text-sm text-gray-400">
              Non e piu possibile modificare questo ordine (meno di 2 giorni
              alla consegna)
            </p>
          )}
      </div>

      <ConfirmDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancel}
        title="Annulla ordine"
        message="Sei sicuro di voler annullare questo ordine?"
        confirmLabel="Annulla ordine"
        loading={cancelling}
      />
    </div>
  );
}
