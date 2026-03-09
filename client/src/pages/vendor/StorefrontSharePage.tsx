import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Copy, ExternalLink, FileDown, Loader2 } from "lucide-react";
import { storefrontApi } from "@/api/storefront";
import { queryKeys } from "@/lib/query-keys";
import { StorefrontPDFDocument } from "@/components/StorefrontPDFDocument";
import { buildOrderFormPDF } from "@/utils/buildOrderFormPDF";
import { useAuth } from "@/contexts/AuthContext";

export function StorefrontSharePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [exportingPdf, setExportingPdf] = useState(false);

  const storeUrl = `${window.location.origin}/store/${companyId}`;

  const { data: storefrontData } = useQuery({
    queryKey: queryKeys.storefront.products(companyId!),
    queryFn: () => storefrontApi.get(companyId!),
    enabled: !!companyId,
  });

  // deliveryData is not pre-fetched here: the PDF builder uses available delivery
  // days but the API requires a zipCode or city, which is customer-specific.
  // The calendar in the PDF will render without zone-specific filtering.
  const deliveryData = undefined;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(storeUrl);
    toast("success", "Link copiato negli appunti");
  };

  const handleExportPdf = async () => {
    if (!storefrontData) {
      toast("error", "I dati del negozio non sono ancora disponibili");
      return;
    }
    setExportingPdf(true);
    try {
      // Step 1: Generate the visual catalog with react-pdf (no links)
      const catalogDoc = (
        <StorefrontPDFDocument
          company={storefrontData.company}
          products={storefrontData.products}
        />
      );
      const catalogBlob = await pdf(catalogDoc).toBlob();
      const catalogBuffer = await catalogBlob.arrayBuffer();

      // Step 2: Add interactive order form page with pdf-lib
      const finalBytes = await buildOrderFormPDF(catalogBuffer, {
        company: storefrontData.company,
        products: storefrontData.products,
        vendorEmail: user?.email ?? "info@example.com",
        deliveryData: deliveryData ?? null,
        baseUrl: window.location.origin,
      });

      // Step 3: Download (cast to avoid SharedArrayBuffer TS false positive)
      const blob = new Blob([finalBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogo-ordine-${storefrontData.company.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast("success", "PDF interattivo esportato con successo");
    } catch (err) {
      console.error(err);
      toast("error", "Errore durante la generazione del PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const productCount = storefrontData?.products.length ?? 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Vetrina</h1>

      <Card className="max-w-2xl">
        <h2 className="mb-2 text-sm font-semibold text-gray-500 uppercase">
          Link del tuo negozio
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Condividi il link online oppure esporta il catalogo come PDF
          interattivo con modulo d&apos;ordine già incluso.
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
            onClick={handleExportPdf}
            disabled={exportingPdf || !storefrontData}
          >
            {exportingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            {exportingPdf ? "Generazione PDF..." : "Esporta PDF interattivo"}
          </Button>
        </div>

        {storefrontData && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-100 p-3 text-xs text-green-800 space-y-1">
            <p className="font-semibold">Il PDF includerà:</p>
            <ul className="list-disc list-inside space-y-0.5 text-green-700">
              <li>Catalogo visivo con {productCount} prodotti</li>
              <li>Modulo d&apos;ordine interattivo con campi compilabili</li>
              <li>Calcolo automatico totali (in Adobe Acrobat)</li>
              <li>Calendario consegne — prossime 2 settimane</li>
              <li>Pulsante invio ordine diretto (crea ordine in dashboard)</li>
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
