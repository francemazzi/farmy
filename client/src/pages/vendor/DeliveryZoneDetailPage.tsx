import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deliveryZonesApi } from "@/api/delivery-zones";
import { deliverySlotsApi } from "@/api/delivery-slots";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Save, Trash2, Plus } from "lucide-react";
import { useState, useEffect } from "react";

const DAY_NAMES = [
  "Lunedi",
  "Martedi",
  "Mercoledi",
  "Giovedi",
  "Venerdi",
  "Sabato",
  "Domenica",
];

export function DeliveryZoneDetailPage() {
  const { companyId, calId, zoneId } = useParams<{
    companyId: string;
    calId: string;
    zoneId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: zone, isLoading } = useQuery({
    queryKey: queryKeys.deliveryZones.detail(zoneId!),
    queryFn: () => deliveryZonesApi.getById(zoneId!),
    enabled: !!zoneId,
  });

  const { data: slots } = useQuery({
    queryKey: queryKeys.deliverySlots.byZone(zoneId!),
    queryFn: () => deliverySlotsApi.listByZone(zoneId!),
    enabled: !!zoneId,
  });

  const [name, setName] = useState("");
  const [zipCodes, setZipCodes] = useState("");
  const [cities, setCities] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Add slot
  const [slotDay, setSlotDay] = useState("");
  const [slotCutoff, setSlotCutoff] = useState("24");
  const [addingSlot, setAddingSlot] = useState(false);

  useEffect(() => {
    if (zone) {
      setName(zone.name);
      setZipCodes(zone.zipCodes);
      setCities(zone.cities);
    }
  }, [zone]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await deliveryZonesApi.update(zoneId!, { name, zipCodes, cities });
      queryClient.invalidateQueries({
        queryKey: queryKeys.deliveryZones.detail(zoneId!),
      });
      toast("success", "Zona aggiornata");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deliveryZonesApi.delete(zoneId!);
      queryClient.invalidateQueries({
        queryKey: queryKeys.deliveryZones.byCalendar(calId!),
      });
      toast("success", "Zona eliminata");
      navigate(`/vendor/companies/${companyId}/calendars/${calId}`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slotDay === "") return;
    setAddingSlot(true);
    try {
      await deliverySlotsApi.create(zoneId!, {
        dayOfWeek: parseInt(slotDay),
        cutoffHours: parseInt(slotCutoff),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.deliverySlots.byZone(zoneId!),
      });
      setSlotDay("");
      setSlotCutoff("24");
      toast("success", "Slot aggiunto");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await deliverySlotsApi.delete(slotId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.deliverySlots.byZone(zoneId!),
      });
      toast("success", "Slot rimosso");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    }
  };

  if (isLoading) return <PageSpinner />;
  if (!zone) return <p className="text-gray-500">Zona non trovata</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{zone.name}</h1>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Elimina
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="z-name"
            label="Nome zona"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            id="z-zip"
            label="CAP (separati da virgola)"
            value={zipCodes}
            onChange={(e) => setZipCodes(e.target.value)}
          />
          <Input
            id="z-cities"
            label="Citta (separate da virgola)"
            value={cities}
            onChange={(e) => setCities(e.target.value)}
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
          Slot di consegna
        </h2>

        {slots?.length ? (
          <div className="mb-4 space-y-2">
            {slots
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {DAY_NAMES[slot.dayOfWeek]}
                    </span>
                    <span className="ml-3 text-sm text-gray-500">
                      Cutoff: {slot.cutoffHours}h prima
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-gray-500">
            Nessuno slot configurato
          </p>
        )}

        <form
          onSubmit={handleAddSlot}
          className="flex flex-wrap items-end gap-3 border-t pt-4"
        >
          <Select
            id="slot-day"
            label="Giorno"
            value={slotDay}
            onChange={(e) => setSlotDay(e.target.value)}
          >
            <option value="">Seleziona giorno</option>
            {DAY_NAMES.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </Select>
          <Input
            id="slot-cutoff"
            label="Cutoff (ore prima)"
            type="number"
            min="0"
            value={slotCutoff}
            onChange={(e) => setSlotCutoff(e.target.value)}
            className="w-32"
          />
          <Button type="submit" size="sm" loading={addingSlot}>
            <Plus className="mr-1 h-4 w-4" />
            Aggiungi
          </Button>
        </form>
      </Card>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Elimina zona"
        message="Sei sicuro? Tutti gli slot di consegna associati verranno eliminati."
        confirmLabel="Elimina"
      />
    </div>
  );
}
