import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { companiesApi } from "@/api/companies";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Building2, Package, Warehouse, Plus, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function DashboardPage() {
  const { data: companies, isLoading } = useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: companiesApi.list,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await companiesApi.create({ name, description: description || undefined });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      setShowCreate(false);
      setName("");
      setDescription("");
      toast("success", "Azienda creata");
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
        <h1 className="text-2xl font-bold text-gray-900">Le mie aziende</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuova azienda
        </Button>
      </div>

      {!companies?.length ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="Nessuna azienda"
          description="Crea la tua prima azienda per iniziare a vendere"
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crea azienda
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Link key={company.id} to={`/vendor/companies/${company.id}`}>
              <Card className="group hover:border-primary-300 transition-colors">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-700">
                  {company.name}
                </h3>
                {company.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {company.description}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Warehouse className="h-4 w-4" />
                    {company._count?.warehouses ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {company._count?.products ?? 0}
                  </span>
                  <ChevronRight className="ml-auto h-4 w-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuova azienda"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="company-name"
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            id="company-desc"
            label="Descrizione (opzionale)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
