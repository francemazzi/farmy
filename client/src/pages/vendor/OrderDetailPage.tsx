import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { OrderStatus } from "@/types";
import { useState } from "react";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "In attesa",
  CONFIRMED: "Confermato",
  PREPARING: "In preparazione",
  SHIPPED: "Spedito",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
};

const STATUS_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
];

export function VendorOrderDetailPage() {
  const { companyId, orderId } = useParams<{
    companyId: string;
    orderId: string;
  }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: queryKeys.orders.detail(orderId!),
    queryFn: () => ordersApi.getById(orderId!),
    enabled: !!orderId,
  });

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      await ordersApi.update(orderId!, { status: newStatus });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId!),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.byCompany(companyId!),
      });
      toast("success", `Stato aggiornato a ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    setUpdating(true);
    try {
      await ordersApi.cancel(orderId!);
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId!),
      });
      toast("success", "Ordine annullato");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) return <PageSpinner />;
  if (!order) return <p className="text-gray-500">Ordine non trovato</p>;

  const currentStatusIdx = STATUS_FLOW.indexOf(order.status as OrderStatus);
  const nextStatus =
    currentStatusIdx >= 0 && currentStatusIdx < STATUS_FLOW.length - 1
      ? STATUS_FLOW[currentStatusIdx + 1]
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase">
            Dettagli
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Cliente</dt>
              <dd className="font-medium">{order.customerUser?.name ?? "-"}</dd>
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
              <dd>{order.paymentMethod === "CASH" ? "Contanti" : order.paymentMethod}</dd>
            </div>
            {order.notes && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Note</dt>
                <dd>{order.notes}</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <dt className="font-semibold text-gray-900">Totale</dt>
              <dd className="font-semibold text-gray-900">
                {order.totalAmount.toFixed(2)} &euro;
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase">
            Azioni
          </h2>
          <div className="space-y-3">
            {nextStatus && order.status !== "CANCELLED" && (
              <Button
                onClick={() => handleStatusUpdate(nextStatus)}
                loading={updating}
                className="w-full"
              >
                Avanza a: {STATUS_LABELS[nextStatus]}
              </Button>
            )}
            {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
              <Button
                variant="danger"
                onClick={handleCancel}
                loading={updating}
                className="w-full"
              >
                Annulla ordine
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase">
          Prodotti
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Prodotto</th>
                <th className="pb-2 font-medium">Quantita</th>
                <th className="pb-2 font-medium">Prezzo unit.</th>
                <th className="pb-2 font-medium text-right">Totale</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items?.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-medium text-gray-900">
                    {item.product?.name ?? item.productId}
                  </td>
                  <td className="py-3 text-gray-600">{item.quantity}</td>
                  <td className="py-3 text-gray-600">
                    {item.unitPrice.toFixed(2)} &euro;
                  </td>
                  <td className="py-3 text-right font-medium">
                    {item.totalPrice.toFixed(2)} &euro;
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
