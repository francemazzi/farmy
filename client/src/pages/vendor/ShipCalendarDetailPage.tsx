import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shipCalendarsApi } from "@/api/ship-calendars";
import { deliveryZonesApi } from "@/api/delivery-zones";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Save, Trash2, Plus, MapPin, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

export function ShipCalendarDetailPage() {
  const { companyId, calId } = useParams<{
    companyId: string;
    calId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: calendar, isLoading } = useQuery({
    queryKey: queryKeys.shipCalendars.detail(calId!),
    queryFn: () => shipCalendarsApi.getById(calId!),
    enabled: !!calId,
  });

  const { data: zones } = useQuery({
    queryKey: queryKeys.deliveryZones.byCalendar(calId!),
    queryFn: () => deliveryZonesApi.listByCalendar(calId!),
    enabled: !!calId,
  });

  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showCreateZone, setShowCreateZone] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zipCodes, setZipCodes] = useState("");
  const [cities, setCities] = useState("");
  const [creatingZone, setCreatingZone] = useState(false);

  useEffect(() => {
    if (calendar) {
      setName(calendar.name);
      setActive(calendar.active);
    }
  }, [calendar]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await shipCalendarsApi.update(calId!, { name, active });
      queryClient.invalidateQueries({
        queryKey: queryKeys.shipCalendars.detail(calId!),
      });
      toast("success", "Calendario aggiornato");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await shipCalendarsApi.delete(calId!);
      queryClient.invalidateQueries({
        queryKey: queryKeys.shipCalendars.byCompany(companyId!),
      });
      toast("success", "Calendario eliminato");
      navigate(`/vendor/companies/${companyId}/calendars`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingZone(true);
    try {
      await deliveryZonesApi.create(calId!, {
        name: zoneName,
        zipCodes: zipCodes || undefined,
        cities: cities || undefined,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.deliveryZones.byCalendar(calId!),
      });
      setShowCreateZone(false);
      setZoneName("");
      setZipCodes("");
      setCities("");
      toast("success", "Zona creata");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setCreatingZone(false);
    }
  };

  if (isLoading) return <PageSpinner />;
  if (!calendar) return <p className="text-gray-500">Calendario non trovato</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{calendar.name}</h1>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Elimina
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="cal-name"
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Calendario attivo
          </label>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              Salva
            </Button>
          </div>
        </form>
      </Card>

      {/* Zones */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Zone di consegna
        </h2>
        <Button size="sm" onClick={() => setShowCreateZone(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Nuova zona
        </Button>
      </div>

      {zones?.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {zones.map((zone) => (
            <Link
              key={zone.id}
              to={`/vendor/companies/${companyId}/calendars/${calId}/zones/${zone.id}`}
            >
              <Card className="group hover:border-primary-300 transition-colors">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary-500" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 group-hover:text-primary-700">
                      {zone.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {zone._count?.deliverySlots ?? 0} slot &middot;{" "}
                      {zone.cities || zone.zipCodes || "Nessun filtro"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-gray-500">
            Nessuna zona di consegna configurata
          </p>
        </Card>
      )}

      <Modal
        open={showCreateZone}
        onClose={() => setShowCreateZone(false)}
        title="Nuova zona di consegna"
      >
        <form onSubmit={handleCreateZone} className="space-y-4">
          <Input
            id="zone-name"
            label="Nome zona"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            placeholder="es. Milano e provincia"
            required
          />
          <Input
            id="zone-zip"
            label="CAP (separati da virgola)"
            value={zipCodes}
            onChange={(e) => setZipCodes(e.target.value)}
            placeholder="es. 20100,20121,20122"
          />
          <Input
            id="zone-cities"
            label="Citta (separate da virgola)"
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            placeholder="es. Milano,Monza"
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowCreateZone(false)}
            >
              Annulla
            </Button>
            <Button type="submit" loading={creatingZone}>
              Crea
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Elimina calendario"
        message="Sei sicuro? Tutte le zone e gli slot associati verranno eliminati."
        confirmLabel="Elimina"
      />
    </div>
  );
}
