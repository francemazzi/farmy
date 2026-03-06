import { useCallback, useState, useRef } from "react";
import { Upload } from "lucide-react";
import { clsx } from "clsx";

interface FileUploadProps {
  accept?: string;
  onFileSelect: (file: File) => void;
  label?: string;
}

export function FileUpload({
  accept = ".csv,.xlsx,.xls,.pdf",
  onFileSelect,
  label = "Trascina un file o clicca per selezionare",
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer",
        dragging
          ? "border-primary-500 bg-primary-50"
          : "border-gray-300 hover:border-primary-400 hover:bg-gray-50",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="mb-3 h-8 w-8 text-gray-400" />
      <p className="text-sm text-gray-600">
        {fileName ?? label}
      </p>
      <p className="mt-1 text-xs text-gray-400">CSV, XLSX, PDF</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
