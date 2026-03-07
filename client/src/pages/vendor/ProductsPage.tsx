import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/api/products";
import { warehousesApi } from "@/api/warehouses";
import { stockApi } from "@/api/stock";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { Package, Plus, Search } from "lucide-react";
import { useState, useMemo } from "react";

export function ProductsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: queryKeys.products.byCompany(companyId!),
    queryFn: () => productsApi.listByCompany(companyId!),
    enabled: !!companyId,
  });

  const { data: warehouses } = useQuery({
    queryKey: queryKeys.warehouses.byCompany(companyId!),
    queryFn: () => warehousesApi.listByCompany(companyId!),
    enabled: !!companyId,
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // New product form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  const [isOrganic, setIsOrganic] = useState(false);
  const [producer, setProducer] = useState("");
  // Stock fields for initial stock
  const [warehouseId, setWarehouseId] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const categories = useMemo(() => {
    if (!products) return [];
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return [...cats].sort() as string[];
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const product = await productsApi.create(companyId!, {
        name,
        description: description || undefined,
        category: category || undefined,
        unitOfMeasure: unitOfMeasure || undefined,
        isOrganic,
        producer: producer || undefined,
      });
      // Create initial stock if warehouse and price provided
      if (warehouseId && price) {
        await stockApi.create(warehouseId, {
          productId: product.id,
          price: parseFloat(price),
          quantity: quantity ? parseFloat(quantity) : 0,
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.byCompany(companyId!),
      });
      setShowCreate(false);
      resetForm();
      toast("success", "Prodotto creato");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setUnitOfMeasure("");
    setIsOrganic(false);
    setProducer("");
    setWarehouseId("");
    setPrice("");
    setQuantity("");
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Prodotti</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo prodotto
        </Button>
      </div>

      {products?.length ? (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca prodotto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Tutte le categorie</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Categoria</th>
                  <th className="pb-2 font-medium">UM</th>
                  <th className="pb-2 font-medium">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <Link
                        to={`/vendor/companies/${companyId}/products/${p.id}`}
                        className="font-medium text-primary-700 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-3 text-gray-600">
                      {p.category ?? "-"}
                    </td>
                    <td className="py-3 text-gray-600">
                      {p.unitOfMeasure ?? "-"}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {p.isOrganic && <Badge variant="success">BIO</Badge>}
                        {p.producer && (
                          <Badge variant="default">{p.producer}</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              Nessun prodotto trovato
            </p>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="Nessun prodotto"
          description="Aggiungi prodotti manualmente o importa un file"
          action={
            <div className="flex gap-3">
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi
              </Button>
              <Link to={`/vendor/companies/${companyId}/import`}>
                <Button variant="secondary">Importa file</Button>
              </Link>
            </div>
          }
        />
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuovo prodotto"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="p-name"
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            id="p-desc"
            label="Descrizione"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="p-category"
              label="Categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Input
              id="p-um"
              label="Unita di misura"
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
              placeholder="KG, PZ..."
            />
          </div>
          <Input
            id="p-producer"
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
            Prodotto biologico (BIO)
          </label>

          <hr />
          <p className="text-sm font-medium text-gray-700">
            Stock iniziale (opzionale)
          </p>
          {warehouses?.length ? (
            <>
              <Select
                id="p-warehouse"
                label="Magazzino"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                <option value="">Seleziona magazzino</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="p-price"
                  label="Prezzo (&euro;)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <Input
                  id="p-qty"
                  label="Quantita"
                  type="number"
                  step="0.1"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              Crea prima un magazzino per aggiungere stock
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
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
