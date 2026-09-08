"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { parseCSVToProducts, ParsedCSVProduct } from "@/lib/csv-parser";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkUploadModal({
  isOpen,
  onClose,
}: BulkUploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedCSVProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a valid .csv file.");
      setSelectedFile(null);
      setParsedProducts([]);
      return;
    }

    setError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const products = parseCSVToProducts(text);
        if (products.length === 0) {
          setError("No valid products found in CSV file.");
          setParsedProducts([]);
        } else {
          setParsedProducts(products);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to parse CSV file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleContinue = () => {
    if (parsedProducts.length === 0) return;
    try {
      sessionStorage.setItem(
        "bulk_products_draft",
        JSON.stringify(parsedProducts),
      );
      onClose();
      router.push("/admin/products/bulk-add");
    } catch (e) {
      console.error("Failed to save draft:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800">
            Upload Multiple Products
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Upload a CSV file containing your product information. You can edit
            and attach images for each product on the next step.
          </p>

          {!selectedFile && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50/80 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center"
            >
              <Upload size={36} className="text-blue-500 mb-3" />
              <span className="text-sm font-medium text-slate-700">
                Drag & Drop your CSV file here
              </span>
              <span className="text-xs text-gray-400 mt-1">
                or click to browse files
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {selectedFile && !error && (
            <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200 p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <FileText size={28} className="text-blue-600 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-800 line-clamp-1">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {parsedProducts.length}{" "}
                    {parsedProducts.length === 1 ? "product" : "products"}{" "}
                    detected
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setParsedProducts([]);
                  setError(null);
                }}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="Remove file"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={parsedProducts.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
