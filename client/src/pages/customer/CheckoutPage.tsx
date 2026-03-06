import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/api/storefront";
import { ordersApi } from "@/api/orders";
import { queryKeys } from "@/lib/query-keys";
import { useCartStore } from "@/stores/cart";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Trash2, ArrowLeft, Minus, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { addDays, format, getDay, isAfter, startOfDay } from "date-fns";
import { it } from "date-fns/locale";

export function CheckoutPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { items, updateQuantity, removeItem, clearCart, totalAmount } =
    useCartStore();
  const total = totalAmount();

  const [step, setStep] = useState<"cart" | "delivery" | "confirm">("cart");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch delivery days when user provides location
  const { data: deliveryData } = useQuery({
    queryKey: queryKeys.storefront.deliveryDays(companyId!, zipCode, city),
    queryFn: () =>
      storefrontApi.getDeliveryDays(companyId!, { zipCode, city }),
    enabled: !!companyId && (!!zipCode || !!city) && step === "delivery",
  });

  // Generate available dates from delivery days
  const availableDates = useMemo(() => {
    if (!deliveryData?.zones.length) return [];
    const dates: Array<{
      date: Date;
      formatted: string;
      isoDate: string;
      zoneId: string;
    }> = [];
    const today = startOfDay(new Date());

    for (const zone of deliveryData.zones) {
      for (const day of zone.days) {
        // Check next 28 days
        for (let i = 1; i <= 28; i++) {
          const candidate = addDays(today, i);
          // getDay returns 0=Sunday, convert to our 0=Monday system
          const candidateDayOfWeek = (getDay(candidate) + 6) % 7;
          if (candidateDayOfWeek === day.dayOfWeek) {
            // Check cutoff
            const cutoffDate = addDays(candidate, -(day.cutoffHours / 24));
            if (isAfter(cutoffDate, new Date())) {
              dates.push({
                date: candidate,
                formatted: format(candidate, "EEEE d MMMM yyyy", {
                  locale: it,
                }),
                isoDate: format(candidate, "yyyy-MM-dd"),
                zoneId: zone.zoneId,
              });
            }
          }
        }
      }
    }

    return dates.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [deliveryData]);

  const handleSubmit = async () => {
    if (!selectedDate || items.length === 0) return;
    setSubmitting(true);
    try {
      await ordersApi.create({
        companyId: companyId!,
        deliveryDate: new Date(selectedDate).toISOString(),
        deliveryZoneId: selectedZoneId || undefined,
        paymentMethod: "CASH",
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          stockId: i.stockId,
          quantity: i.quantity,
        })),
      });
      clearCart();
      toast("success", "Ordine confermato!");
      navigate("/my-orders");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && step === "cart") {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="text-gray-500 mb-4">Il tuo carrello e vuoto</p>
        <Button
          variant="secondary"
          onClick={() => navigate(`/store/${companyId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna al negozio
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() =>
          step === "cart"
            ? navigate(`/store/${companyId}`)
            : setStep(step === "confirm" ? "delivery" : "cart")
        }
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Indietro
      </button>

      {/* Progress */}
      <div className="mb-6 flex gap-2">
        {["cart", "delivery", "confirm"].map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              i <= ["cart", "delivery", "confirm"].indexOf(step)
                ? "bg-primary-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Cart Review */}
      {step === "cart" && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Riepilogo carrello
          </h1>

          {items.map((item) => (
            <Card key={item.stockId}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">
                    {item.price.toFixed(2)} &euro;
                    {item.unitOfMeasure && `/${item.unitOfMeasure}`}
                  </p>
                </div>

                <div className="flex items-center rounded-lg border border-gray-300">
                  <button
                    onClick={() =>
                      updateQuantity(item.stockId, item.quantity - 1)
                    }
                    className="px-2 py-1.5 text-gray-600 hover:bg-gray-100"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="px-3 text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(
                        item.stockId,
                        Math.min(item.quantity + 1, item.maxQuantity),
                      )
                    }
                    className="px-2 py-1.5 text-gray-600 hover:bg-gray-100"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <span className="w-20 text-right font-semibold">
                  {(item.price * item.quantity).toFixed(2)} &euro;
                </span>

                <button
                  onClick={() => removeItem(item.stockId)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}

          <Card>
            <div className="flex justify-between text-lg font-bold">
              <span>Totale</span>
              <span>{total.toFixed(2)} &euro;</span>
            </div>
          </Card>

          <Button onClick={() => setStep("delivery")} className="w-full" size="lg">
            Continua
          </Button>
        </div>
      )}

      {/* Step 2: Delivery */}
      {step === "delivery" && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Scegli la consegna
          </h1>

          <Card>
            <p className="mb-3 text-sm text-gray-600">
              Inserisci il tuo CAP o citta per vedere i giorni di consegna
              disponibili
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="zip"
                label="CAP"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="es. 20100"
              />
              <Input
                id="city"
                label="Citta"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="es. Milano"
              />
            </div>
          </Card>

          {availableDates.length > 0 ? (
            <Card>
              <h2 className="mb-3 font-semibold text-gray-900">
                Giorni disponibili
              </h2>
              <div className="space-y-2">
                {availableDates.map((d) => (
                  <label
                    key={d.isoDate + d.zoneId}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selectedDate === d.isoDate
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery-date"
                      value={d.isoDate}
                      checked={selectedDate === d.isoDate}
                      onChange={() => {
                        setSelectedDate(d.isoDate);
                        setSelectedZoneId(d.zoneId);
                      }}
                      className="text-primary-600"
                    />
                    <span className="text-sm font-medium capitalize">
                      {d.formatted}
                    </span>
                  </label>
                ))}
              </div>
            </Card>
          ) : (zipCode || city) ? (
            <Card>
              <p className="text-sm text-gray-500">
                Nessun giorno di consegna disponibile per la tua zona
              </p>
            </Card>
          ) : null}

          <Button
            onClick={() => setStep("confirm")}
            disabled={!selectedDate}
            className="w-full"
            size="lg"
          >
            Continua
          </Button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === "confirm" && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Conferma ordine
          </h1>

          <Card>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Prodotti</dt>
                <dd className="font-medium">{items.length} articoli</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Consegna</dt>
                <dd className="font-medium capitalize">
                  {selectedDate &&
                    format(new Date(selectedDate), "EEEE d MMMM yyyy", {
                      locale: it,
                    })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Pagamento</dt>
                <dd className="font-medium">Contanti alla consegna</dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt className="text-lg font-bold">Totale</dt>
                <dd className="text-lg font-bold">
                  {total.toFixed(2)} &euro;
                </dd>
              </div>
            </dl>
          </Card>

          <Textarea
            id="notes"
            label="Note (opzionale)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Indicazioni per la consegna..."
          />

          <Button
            onClick={handleSubmit}
            loading={submitting}
            className="w-full"
            size="lg"
          >
            Conferma ordine
          </Button>
        </div>
      )}
    </div>
  );
}
