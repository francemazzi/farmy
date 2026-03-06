import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shipCalendarsApi } from "@/api/ship-calendars";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { Calendar, Plus, ChevronRight, MapPin } from "lucide-react";
import { useState } from "react";

export function ShipCalendarsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: calendars, isLoading } = useQuery({
    queryKey: queryKeys.shipCalendars.byCompany(companyId!),
    queryFn: () => shipCalendarsApi.listByCompany(companyId!),
    enabled: !!companyId,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await shipCalendarsApi.create(companyId!, { name });
      queryClient.invalidateQueries({
        queryKey: queryKeys.shipCalendars.byCompany(companyId!),
      });
      setShowCreate(false);
      setName("");
      toast("success", "Calendario creato");
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
        <h1 className="text-2xl font-bold text-gray-900">
          Calendari consegne
        </h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo calendario
        </Button>
      </div>

      {!calendars?.length ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="Nessun calendario"
          description="Crea un calendario per gestire le consegne ai tuoi clienti"
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crea calendario
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {calendars.map((cal) => (
            <Link
              key={cal.id}
              to={`/vendor/companies/${companyId}/calendars/${cal.id}`}
            >
              <Card className="group hover:border-primary-300 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-700">
                    {cal.name}
                  </h3>
                  <Badge variant={cal.active ? "success" : "default"}>
                    {cal.active ? "Attivo" : "Disattivo"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-1 text-sm text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>{cal._count?.deliveryZones ?? 0} zone</span>
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
        title="Nuovo calendario"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="cal-name"
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="es. Consegne settimanali"
            required
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
