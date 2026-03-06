import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { companiesApi } from "@/api/companies";
import { queryKeys } from "@/lib/query-keys";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  Warehouse,
  Package,
  FileUp,
  Calendar,
  ShoppingCart,
  Share2,
  ChevronRight,
  Save,
} from "lucide-react";
import { useState, useEffect } from "react";

export function CompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: company, isLoading } = useQuery({
    queryKey: queryKeys.companies.detail(companyId!),
    queryFn: () => companiesApi.getById(companyId!),
    enabled: !!companyId,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setDescription(company.description ?? "");
    }
  }, [company]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await companiesApi.update(companyId!, {
        name,
        description: description || undefined,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.companies.detail(companyId!),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      toast("success", "Azienda aggiornata");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageSpinner />;
  if (!company) return <p className="text-gray-500">Azienda non trovata</p>;

  const base = `/vendor/companies/${companyId}`;
  const links = [
    { to: `${base}/warehouses`, icon: Warehouse, label: "Magazzini" },
    { to: `${base}/products`, icon: Package, label: "Prodotti" },
    { to: `${base}/import`, icon: FileUp, label: "Importa prodotti" },
    { to: `${base}/calendars`, icon: Calendar, label: "Calendari consegne" },
    { to: `${base}/orders`, icon: ShoppingCart, label: "Ordini" },
    { to: `${base}/storefront`, icon: Share2, label: "Vetrina" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="name"
            label="Nome azienda"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            id="description"
            label="Descrizione"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              Salva
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to}>
            <Card className="group flex items-center gap-4 hover:border-primary-300 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Icon className="h-5 w-5" />
              </div>
              <span className="flex-1 font-medium text-gray-900 group-hover:text-primary-700">
                {label}
              </span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
