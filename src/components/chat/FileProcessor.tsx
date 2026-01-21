import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface FileProcessorProps {
  onDataLoaded: (data: any[], fileName: string, columns: string[]) => void;
  disabled?: boolean;
  acceptedFormats?: string[];
}

const FileProcessor: React.FC<FileProcessorProps> = ({
  onDataLoaded,
  disabled = false,
  acceptedFormats = [".csv", ".xlsx", ".xls"],
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processCSV = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const columns = results.meta.fields || [];
        const data = results.data as any[];
        onDataLoaded(data, file.name, columns);
        toast.success(`${data.length} registros carregados de ${file.name}`);
        setIsProcessing(false);
      },
      error: (error) => {
        toast.error(`Erro ao processar CSV: ${error.message}`);
        setIsProcessing(false);
      },
    });
  }, [onDataLoaded]);

  const processXLSX = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { 
          type: "array",
          cellDates: true,
          dateNF: "yyyy-mm-dd"
        });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(firstSheet, { defval: "" }) as any[];
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        onDataLoaded(data, file.name, columns);
        toast.success(`${data.length} registros carregados de ${file.name}`);
      } catch (error) {
        toast.error(`Erro ao processar Excel: ${(error as Error).message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo");
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  }, [onDataLoaded]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!extension) {
      toast.error("Formato de arquivo não reconhecido");
      return;
    }

    setIsProcessing(true);

    if (extension === "csv") {
      processCSV(file);
    } else if (extension === "xlsx" || extension === "xls") {
      processXLSX(file);
    } else {
      toast.error(`Formato .${extension} não suportado`);
      setIsProcessing(false);
    }
  }, [processCSV, processXLSX]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: disabled || isProcessing,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-all duration-200
        ${disabled || isProcessing ? "opacity-50 cursor-not-allowed" : ""}
        ${isDragActive 
          ? "border-cyan-400 bg-cyan-500/10" 
          : "border-cyan-500/30 hover:border-cyan-400/60 bg-slate-900/50"
        }
      `}
    >
      <input {...getInputProps()} disabled={disabled || isProcessing} />
      
      {isProcessing ? (
        <div className="space-y-2">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-cyan-400" />
          <p className="text-cyan-300">Processando arquivo...</p>
        </div>
      ) : isDragActive ? (
        <div className="space-y-2">
          <Upload className="w-12 h-12 mx-auto text-cyan-400" />
          <p className="text-cyan-300 font-medium">Solte o arquivo aqui...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            Arraste um arquivo ou clique para selecionar
          </p>
          <div className="flex justify-center gap-2">
            {acceptedFormats.map((format) => (
              <Badge 
                key={format} 
                variant="outline" 
                className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
              >
                {format}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileProcessor;
