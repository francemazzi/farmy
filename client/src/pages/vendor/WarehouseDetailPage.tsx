import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { warehousesApi } from "@/api/warehouses";
import { stockApi } from "@/api/stock";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Save, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

export function WarehouseDetailPage() {
  const { companyId, id } = useParams<{ companyId: string; id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: warehouse, isLoading } = useQuery({
    queryKey: queryKeys.warehouses.detail(id!),
    queryFn: () => warehousesApi.getById(id!),
    enabled: !!id,
  });

  const { data: stocks } = useQuery({
    queryKey: queryKeys.stock.byWarehouse(id!),
    queryFn: () => stockApi.listByWarehouse(id!),
    enabled: !!id,
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (warehouse) {
      setName(warehouse.name);
      setAddress(warehouse.address ?? "");
    }
  }, [warehouse]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await warehousesApi.update(id!, {
        name,
        address: address || undefined,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.detail(id!) });
      toast("success", "Magazzino aggiornato");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await warehousesApi.delete(id!);
      queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.byCompany(companyId!),
      });
      toast("success", "Magazzino eliminato");
      navigate(`/vendor/companies/${companyId}/warehouses`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) return <PageSpinner />;
  if (!warehouse) return <p className="text-gray-500">Magazzino non trovato</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{warehouse.name}</h1>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Elimina
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="name"
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            id="address"
            label="Indirizzo"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              Salva
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Stock ({stocks?.length ?? 0})
        </h2>
        {stocks?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Prodotto</th>
                  <th className="pb-2 font-medium">Quantita</th>
                  <th className="pb-2 font-medium">Prezzo</th>
                  <th className="pb-2 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stocks.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 font-medium text-gray-900">
                      {s.product?.name ?? s.productId}
                    </td>
                    <td className="py-3 text-gray-600">{s.quantity}</td>
                    <td className="py-3 text-gray-600">
                      {s.price.toFixed(2)} &euro;
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {s.isNew && <Badge variant="info">Novita</Badge>}
                        {s.isPromotional && (
                          <Badge variant="warning">Promo</Badge>
                        )}
                        {s.lowStock && (
                          <Badge variant="danger">Poca disp.</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nessuno stock presente</p>
        )}
      </Card>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Elimina magazzino"
        message="Sei sicuro di voler eliminare questo magazzino? Tutto lo stock associato verra eliminato."
        confirmLabel="Elimina"
        loading={deleting}
      />
    </div>
  );
}
