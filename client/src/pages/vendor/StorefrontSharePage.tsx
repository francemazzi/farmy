import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Copy, ExternalLink } from "lucide-react";

export function StorefrontSharePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const { toast } = useToast();

  const storeUrl = `${window.location.origin}/store/${companyId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(storeUrl);
    toast("success", "Link copiato negli appunti");
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Vetrina</h1>

      <Card className="max-w-xl">
        <h2 className="mb-2 text-sm font-semibold text-gray-500 uppercase">
          Link del tuo negozio
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Condividi questo link con i tuoi clienti per permettere loro di
          visualizzare i tuoi prodotti e fare ordini.
        </p>

        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <code className="flex-1 text-sm text-gray-700 break-all">
            {storeUrl}
          </code>
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex gap-3">
          <Button onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copia link
          </Button>
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">
              <ExternalLink className="mr-2 h-4 w-4" />
              Anteprima
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
