import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/api/products";
import { stockApi } from "@/api/stock";
import { warehousesApi } from "@/api/warehouses";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Save, Trash2, Plus } from "lucide-react";
import { useState, useEffect } from "react";

export function ProductDetailPage() {
  const { companyId, id } = useParams<{ companyId: string; id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery({
    queryKey: queryKeys.products.detail(id!),
    queryFn: () => productsApi.getById(id!),
    enabled: !!id,
  });

  const { data: warehouses } = useQuery({
    queryKey: queryKeys.warehouses.byCompany(companyId!),
    queryFn: () => warehousesApi.listByCompany(companyId!),
    enabled: !!companyId,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  const [isOrganic, setIsOrganic] = useState(false);
  const [producer, setProducer] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Add stock
  const [addStockWhId, setAddStockWhId] = useState("");
  const [addStockPrice, setAddStockPrice] = useState("");
  const [addStockQty, setAddStockQty] = useState("");
  const [addingStock, setAddingStock] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setCategory(product.category ?? "");
      setUnitOfMeasure(product.unitOfMeasure ?? "");
      setIsOrganic(product.isOrganic);
      setProducer(product.producer ?? "");
    }
  }, [product]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await productsApi.update(id!, {
        name,
        description: description || undefined,
        category: category || undefined,
        unitOfMeasure: unitOfMeasure || undefined,
        isOrganic,
        producer: producer || undefined,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id!) });
      toast("success", "Prodotto aggiornato");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await productsApi.delete(id!);
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.byCompany(companyId!),
      });
      toast("success", "Prodotto eliminato");
      navigate(`/vendor/companies/${companyId}/products`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStockWhId || !addStockPrice) return;
    setAddingStock(true);
    try {
      await stockApi.create(addStockWhId, {
        productId: id!,
        price: parseFloat(addStockPrice),
        quantity: addStockQty ? parseFloat(addStockQty) : 0,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id!) });
      setAddStockWhId("");
      setAddStockPrice("");
      setAddStockQty("");
      toast("success", "Stock aggiunto");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setAddingStock(false);
    }
  };

  const handleDeleteStock = async (stockId: string) => {
    try {
      await stockApi.delete(stockId);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id!) });
      toast("success", "Stock rimosso");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    }
  };

  const handleUpdateStock = async (
    stockId: string,
    field: string,
    value: number | boolean,
  ) => {
    try {
      await stockApi.update(stockId, { [field]: value });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id!) });
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    }
  };

  if (isLoading) return <PageSpinner />;
  if (!product) return <p className="text-gray-500">Prodotto non trovato</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
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
            id="desc"
            label="Descrizione"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="category"
              label="Categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Input
              id="um"
              label="Unita di misura"
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
            />
          </div>
          <Input
            id="producer"
            label="Produttore"
            value={producer}
            onChange={(e) => setProducer(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isOrganic}
              onChange={(e) => setIsOrganic(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Biologico (BIO)
          </label>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              Salva
            </Button>
          </div>
        </form>
      </Card>

      {/* Stock */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Stock</h2>

        {product.stocks?.length ? (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Magazzino</th>
                  <th className="pb-2 font-medium">Quantita</th>
                  <th className="pb-2 font-medium">Prezzo</th>
                  <th className="pb-2 font-medium">Stato</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {product.stocks.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 text-gray-900">
                      {s.warehouse?.name ?? s.warehouseId}
                    </td>
                    <td className="py-3">
                      <input
                        type="number"
                        defaultValue={s.quantity}
                        step="0.1"
                        min="0"
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                        onBlur={(e) =>
                          handleUpdateStock(
                            s.id,
                            "quantity",
                            parseFloat(e.target.value),
                          )
                        }
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="number"
                        defaultValue={s.price}
                        step="0.01"
                        min="0"
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                        onBlur={(e) =>
                          handleUpdateStock(
                            s.id,
                            "price",
                            parseFloat(e.target.value),
                          )
                        }
                      />
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.isNew && <Badge variant="info">Novita</Badge>}
                        {s.isPromotional && (
                          <Badge variant="warning">Promo</Badge>
                        )}
                        {s.lowStock && (
                          <Badge variant="danger">Poca disp.</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDeleteStock(s.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Rimuovi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mb-4 text-sm text-gray-500">
            Nessuno stock per questo prodotto
          </p>
        )}

        {/* Add stock */}
        {warehouses?.length ? (
          <form
            onSubmit={handleAddStock}
            className="flex flex-wrap items-end gap-3 border-t pt-4"
          >
            <Select
              id="add-wh"
              label="Magazzino"
              value={addStockWhId}
              onChange={(e) => setAddStockWhId(e.target.value)}
            >
              <option value="">Seleziona</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            <Input
              id="add-price"
              label="Prezzo"
              type="number"
              step="0.01"
              min="0"
              value={addStockPrice}
              onChange={(e) => setAddStockPrice(e.target.value)}
              className="w-24"
            />
            <Input
              id="add-qty"
              label="Quantita"
              type="number"
              step="0.1"
              min="0"
              value={addStockQty}
              onChange={(e) => setAddStockQty(e.target.value)}
              className="w-24"
            />
            <Button type="submit" size="sm" loading={addingStock}>
              <Plus className="mr-1 h-4 w-4" />
              Aggiungi
            </Button>
          </form>
        ) : null}
      </Card>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Elimina prodotto"
        message="Sei sicuro di voler eliminare questo prodotto? Tutto lo stock associato verra eliminato."
        confirmLabel="Elimina"
      />
    </div>
  );
}
