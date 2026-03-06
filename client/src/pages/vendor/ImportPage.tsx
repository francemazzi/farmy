import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { warehousesApi } from "@/api/warehouses";
import { importApi } from "@/api/import";
import { queryKeys } from "@/lib/query-keys";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { FileUpload } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";
import { Upload, CheckCircle } from "lucide-react";
import { useState } from "react";

export function ImportPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const { toast } = useToast();

  const { data: warehouses } = useQuery({
    queryKey: queryKeys.warehouses.byCompany(companyId!),
    queryFn: () => warehousesApi.listByCompany(companyId!),
    enabled: !!companyId,
  });

  const [warehouseId, setWarehouseId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    productsCreated: number;
  } | null>(null);

  const handleUpload = async () => {
    if (!file || !warehouseId) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await importApi.upload(companyId!, warehouseId, file);
      setResult(res);
      setFile(null);
      toast("success", `${res.productsCreated} prodotti importati`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Errore durante l'importazione");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Importa prodotti
      </h1>

      <Card className="max-w-xl">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Carica un file CSV, Excel (XLSX) o PDF con il listino prodotti. I
            prodotti verranno creati automaticamente con il relativo stock.
          </p>

          <Select
            id="import-wh"
            label="Magazzino di destinazione"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">Seleziona magazzino</option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>

          <FileUpload onFileSelect={setFile} />

          {file && (
            <p className="text-sm text-gray-600">
              File selezionato: <strong>{file.name}</strong> (
              {(file.size / 1024).toFixed(1)} KB)
            </p>
          )}

          <Button
            onClick={handleUpload}
            loading={uploading}
            disabled={!file || !warehouseId}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Importa
          </Button>

          {result && (
            <div className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>
                <strong>{result.productsCreated}</strong> prodotti importati
                con successo
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
