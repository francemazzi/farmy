import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/api/storefront";
import { queryKeys } from "@/lib/query-keys";
import { useCartStore } from "@/stores/cart";
import { PageSpinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Search, ShoppingCart, Leaf, Sparkles, Tag, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import type { StorefrontProduct } from "@/types";

export function StorefrontPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const { toast } = useToast();
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.storefront.products(companyId!),
    queryFn: () => storefrontApi.get(companyId!),
    enabled: !!companyId,
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showOnlyPromo, setShowOnlyPromo] = useState(false);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyBio, setShowOnlyBio] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => {
    if (!data?.products) return [];
    const cats = new Set(data.products.map((p) => p.category).filter(Boolean));
    return [...cats].sort() as string[];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data?.products) return [];
    return data.products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (showOnlyBio && !p.isOrganic) return false;
      if (showOnlyPromo && !p.stocks.some((s) => s.isPromotional))
        return false;
      if (showOnlyNew && !p.stocks.some((s) => s.isNew)) return false;
      return true;
    });
  }, [data, search, categoryFilter, showOnlyBio, showOnlyPromo, showOnlyNew]);

  const handleAddToCart = (product: StorefrontProduct) => {
    const stock = product.stocks[0];
    if (!stock) return;
    addItem(companyId!, {
      productId: product.id,
      stockId: stock.id,
      name: product.name,
      price: stock.price,
      unitOfMeasure: product.unitOfMeasure ?? undefined,
      maxQuantity: stock.quantity,
      imageUrl: product.imageUrl ?? undefined,
    });
    toast("success", `${product.name} aggiunto al carrello`);
  };

  const totalInCart = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  if (isLoading) return <PageSpinner />;
  if (!data) return <p className="text-gray-500">Negozio non trovato</p>;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {data.company.name}
        </h1>
        {data.company.description && (
          <p className="mt-1 text-gray-600">{data.company.description}</p>
        )}
      </div>

      {/* Search + Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca prodotti..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtri
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-4">
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="">Tutte le categorie</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={showOnlyBio}
                onChange={(e) => setShowOnlyBio(e.target.checked)}
                className="rounded border-gray-300 text-primary-600"
              />
              <Leaf className="h-3.5 w-3.5 text-green-600" />
              Biologico
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={showOnlyNew}
                onChange={(e) => setShowOnlyNew(e.target.checked)}
                className="rounded border-gray-300 text-primary-600"
              />
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Novita
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={showOnlyPromo}
                onChange={(e) => setShowOnlyPromo(e.target.checked)}
                className="rounded border-gray-300 text-primary-600"
              />
              <Tag className="h-3.5 w-3.5 text-orange-600" />
              Promozioni
            </label>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-gray-500">Nessun prodotto trovato</p>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => {
            const stock = product.stocks[0];
            if (!stock) return null;
            const inCart = cartItems.find((i) => i.stockId === stock.id);

            return (
              <div
                key={product.id}
                className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image */}
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-gradient-to-br from-primary-50 to-earth-50">
                    <span className="text-4xl opacity-50">
                      {product.isOrganic ? "🌿" : "📦"}
                    </span>
                  </div>
                )}

                <div className="p-4">
                  {/* Badges */}
                  <div className="mb-2 flex flex-wrap gap-1">
                    {product.isOrganic && (
                      <Badge variant="success">BIO</Badge>
                    )}
                    {stock.isNew && <Badge variant="info">Novita</Badge>}
                    {stock.isPromotional && (
                      <Badge variant="warning">Promo</Badge>
                    )}
                    {stock.lowStock && (
                      <Badge variant="danger">Ultime scorte</Badge>
                    )}
                  </div>

                  <Link to={`/store/${companyId}/product/${product.id}`}>
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>

                  {product.producer && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {product.producer}
                    </p>
                  )}

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <span className="text-lg font-bold text-gray-900">
                        {stock.price.toFixed(2)} &euro;
                      </span>
                      {product.unitOfMeasure && (
                        <span className="text-sm text-gray-400">
                          /{product.unitOfMeasure}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                      title="Aggiungi al carrello"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  </div>

                  {inCart && (
                    <p className="mt-2 text-xs text-primary-600 font-medium">
                      {inCart.quantity} nel carrello
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating cart bar */}
      {totalInCart > 0 && (
        <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-md">
          <Link to={`/store/${companyId}/checkout`}>
            <div className="flex items-center justify-between rounded-xl bg-primary-600 px-5 py-3.5 text-white shadow-lg">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-medium">{totalInCart} prodotti</span>
              </div>
              <span className="font-bold">{totalAmount.toFixed(2)} &euro;</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
