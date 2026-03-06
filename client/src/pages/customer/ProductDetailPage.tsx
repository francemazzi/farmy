import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/api/storefront";
import { queryKeys } from "@/lib/query-keys";
import { useCartStore } from "@/stores/cart";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ShoppingCart, ArrowLeft, Minus, Plus } from "lucide-react";
import { useState } from "react";

export function CustomerProductDetailPage() {
  const { companyId, id } = useParams<{ companyId: string; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.storefront.products(companyId!),
    queryFn: () => storefrontApi.get(companyId!),
    enabled: !!companyId,
  });

  const product = data?.products.find((p) => p.id === id);

  if (isLoading) return <PageSpinner />;
  if (!product) return <p className="text-gray-500">Prodotto non trovato</p>;

  const stock = product.stocks[0];
  if (!stock) return <p className="text-gray-500">Non disponibile</p>;

  const handleAdd = () => {
    addItem(companyId!, {
      productId: product.id,
      stockId: stock.id,
      name: product.name,
      price: stock.price,
      unitOfMeasure: product.unitOfMeasure ?? undefined,
      maxQuantity: stock.quantity,
      imageUrl: product.imageUrl ?? undefined,
      quantity,
    });
    toast("success", `${product.name} aggiunto al carrello`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna al negozio
      </button>

      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="mb-6 h-64 w-full rounded-xl object-cover"
        />
      ) : (
        <div className="mb-6 flex h-64 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-earth-50">
          <span className="text-6xl opacity-50">
            {product.isOrganic ? "🌿" : "📦"}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {product.isOrganic && <Badge variant="success">BIO</Badge>}
          {stock.isNew && <Badge variant="info">Novita</Badge>}
          {stock.isPromotional && <Badge variant="warning">Promo</Badge>}
          {stock.lowStock && <Badge variant="danger">Ultime scorte</Badge>}
          {product.category && (
            <Badge variant="default">{product.category}</Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

        {product.producer && (
          <p className="text-sm text-gray-500">
            Produttore: {product.producer}
          </p>
        )}

        {product.description && (
          <p className="text-gray-600">{product.description}</p>
        )}

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-gray-900">
                {stock.price.toFixed(2)} &euro;
              </span>
              {product.unitOfMeasure && (
                <span className="text-sm text-gray-400 ml-1">
                  /{product.unitOfMeasure}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Disponibile: {stock.quantity} {product.unitOfMeasure ?? ""}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-4 py-2 font-medium">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity(Math.min(stock.quantity, quantity + 1))
                }
                className="px-3 py-2 text-gray-600 hover:bg-gray-100"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button onClick={handleAdd} className="flex-1">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Aggiungi al carrello
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
