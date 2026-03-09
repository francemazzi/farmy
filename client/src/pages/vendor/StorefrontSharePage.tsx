import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Copy, ExternalLink, FileDown, Loader2 } from "lucide-react";
import { storefrontApi } from "@/api/storefront";
import { queryKeys } from "@/lib/query-keys";
import { StorefrontPDFDocument } from "@/components/StorefrontPDFDocument";

export function StorefrontSharePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const { toast } = useToast();
  const [exportingPdf, setExportingPdf] = useState(false);

  const storeUrl = `${window.location.origin}/store/${companyId}`;

  const { data } = useQuery({
    queryKey: queryKeys.storefront.products(companyId!),
    queryFn: () => storefrontApi.get(companyId!),
    enabled: !!companyId,
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(storeUrl);
    toast("success", "Link copiato negli appunti");
  };

  const handleExportPdf = async () => {
    if (!data) {
      toast("error", "I dati del negozio non sono ancora disponibili");
      return;
    }
    setExportingPdf(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(storeUrl, {
        width: 200,
        margin: 1,
        color: { dark: "#2d6a4f", light: "#ffffff" },
      });

      const doc = (
        <StorefrontPDFDocument
          company={data.company}
          products={data.products}
          storeUrl={storeUrl}
          qrDataUrl={qrDataUrl}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogo-${data.company.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", "PDF catalogo esportato con successo");
    } catch (err) {
      console.error(err);
      toast("error", "Errore durante la generazione del PDF");
    } finally {
      setExportingPdf(false);
    }
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

        <div className="mt-4 flex flex-wrap gap-3">
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
          <Button
            variant="secondary"
            onClick={handleExportPdf}
            disabled={exportingPdf || !data}
          >
            {exportingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            {exportingPdf ? "Generazione..." : "Esporta PDF catalogo"}
          </Button>
        </div>

        {data && (
          <p className="mt-3 text-xs text-gray-400">
            Il PDF includerà {data.products.length} prodotti con QR code e link cliccabili.
          </p>
        )}
      </Card>
    </div>
  );
}
