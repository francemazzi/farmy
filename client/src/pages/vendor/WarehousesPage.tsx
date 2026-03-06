import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { warehousesApi } from "@/api/warehouses";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { Warehouse, Plus, Package, ChevronRight } from "lucide-react";
import { useState } from "react";

export function WarehousesPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: warehouses, isLoading } = useQuery({
    queryKey: queryKeys.warehouses.byCompany(companyId!),
    queryFn: () => warehousesApi.listByCompany(companyId!),
    enabled: !!companyId,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await warehousesApi.create(companyId!, {
        name,
        address: address || undefined,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.byCompany(companyId!),
      });
      setShowCreate(false);
      setName("");
      setAddress("");
      toast("success", "Magazzino creato");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Magazzini</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo magazzino
        </Button>
      </div>

      {!warehouses?.length ? (
        <EmptyState
          icon={<Warehouse className="h-12 w-12" />}
          title="Nessun magazzino"
          description="Crea un magazzino per gestire lo stock dei prodotti"
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crea magazzino
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((wh) => (
            <Link
              key={wh.id}
              to={`/vendor/companies/${companyId}/warehouses/${wh.id}`}
            >
              <Card className="group hover:border-primary-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Warehouse className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-700">
                      {wh.name}
                    </h3>
                    {wh.address && (
                      <p className="text-sm text-gray-500">{wh.address}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                <div className="mt-3 flex items-center gap-1 text-sm text-gray-400">
                  <Package className="h-4 w-4" />
                  <span>{wh._count?.stocks ?? 0} prodotti in stock</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuovo magazzino"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="wh-name"
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            id="wh-address"
            label="Indirizzo (opzionale)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowCreate(false)}
            >
              Annulla
            </Button>
            <Button type="submit" loading={creating}>
              Crea
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
