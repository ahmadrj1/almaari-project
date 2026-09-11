"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  X,
  AlertCircle,
  Download,
  FolderOpen,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { parseCSVToProducts, ParsedCSVProduct } from "@/lib/csv-parser";
import { resolvedImageStore, ResolvedImage } from "@/lib/resolved-image-store";
export { resolvedImageStore };

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
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedCSVProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Image resolution state
  const [matchedCount, setMatchedCount] = useState(0);
  const [unmatchedNames, setUnmatchedNames] = useState<string[]>([]);
  const [imagesResolved, setImagesResolved] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  if (!isOpen) return null;

  // All unique imagePath filenames across all products
  const detectedImagePaths = parsedProducts.flatMap((p) => p.csvImages ?? []);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a valid .csv file.");
      setSelectedFile(null);
      setParsedProducts([]);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setMatchedCount(0);
    setUnmatchedNames([]);
    setImagesResolved(false);
    resolvedImageStore.clear();

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

  const handleImageFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    const fileMap = new Map<string, File>();
    fileArray.forEach((f) => fileMap.set(f.name.toLowerCase(), f));

    let matched = 0;
    const unmatched: string[] = [];

    const updated = parsedProducts.map((product) => {
      if (!product.csvImages || product.csvImages.length === 0) return product;

      const resolved: ResolvedImage[] = [];
      for (const csvImg of product.csvImages) {
        const baseName =
          csvImg.imagePath.split(/[\\/]/).pop()?.trim() ||
          csvImg.imagePath.trim();
        const found = fileMap.get(baseName.toLowerCase());
        if (found) {
          matched++;
          resolved.push({
            fileName: baseName,
            file: found,
            colorName: csvImg.colorName,
          });
        } else {
          if (!unmatched.includes(baseName)) unmatched.push(baseName);
        }
      }

      if (resolved.length > 0) {
        resolvedImageStore.set(product.id, resolved);
        return { ...product, resolvedImages: resolved };
      }
      return product;
    });

    setParsedProducts(updated);
    setMatchedCount(matched);
    setUnmatchedNames(unmatched);
    setImagesResolved(true);
  };

  const handleContinue = () => {
    if (parsedProducts.length === 0) return;
    try {
      // File objects can't be JSON-serialized; strip them before sessionStorage
      const serializeable = parsedProducts.map(
        ({ resolvedImages: _, ...rest }) => rest,
      );
      sessionStorage.setItem(
        "bulk_products_draft",
        JSON.stringify(serializeable),
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
          {/* Download template */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Need a template?
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                XLSX file with dropdown options for color, size &amp; category
              </p>
            </div>
            <button
              type="button"
              disabled={isDownloadingTemplate}
              onClick={async () => {
                setIsDownloadingTemplate(true);
                try {
                  const res = await fetch("/api/admin/products/template");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "products_template.xlsx";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  console.error("Failed to download template");
                } finally {
                  setIsDownloadingTemplate(false);
                }
              }}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingTemplate ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {isDownloadingTemplate ? "Generating..." : "Download"}
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Fill the template, save as CSV, then upload below. You can edit and
            attach images for each product on the next step.
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
                Drag &amp; Drop your CSV file here
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
                  setMatchedCount(0);
                  setUnmatchedNames([]);
                  setImagesResolved(false);
                  resolvedImageStore.clear();
                }}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="Remove file"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Image resolution — only shown when imagePath detected */}
          {selectedFile && !error && detectedImagePaths.length > 0 && (
            <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {detectedImagePaths.length} image
                  {detectedImagePaths.length > 1 ? "s" : ""} detected across{" "}
                  {
                    parsedProducts.filter(
                      (p) => p.csvImages && p.csvImages.length > 0,
                    ).length
                  }{" "}
                  product
                  {parsedProducts.filter(
                    (p) => p.csvImages && p.csvImages.length > 0,
                  ).length > 1
                    ? "s"
                    : ""}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Select the folder containing your images to auto-match by
                  filename.
                </p>
              </div>

              <button
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-lg transition-colors w-full justify-center"
              >
                <FolderOpen size={16} />
                {imagesResolved
                  ? "Re-select Folder / Files"
                  : "Select Images Folder"}
              </button>

              {/* Hidden folder input */}
              <input
                ref={folderInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                // @ts-expect-error webkitdirectory is non-standard
                webkitdirectory=""
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleImageFiles(e.target.files);
                  }
                }}
              />

              {imagesResolved && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-green-700">
                    <CheckCircle2 size={13} />
                    {matchedCount} of {detectedImagePaths.length} image
                    {detectedImagePaths.length > 1 ? "s" : ""} matched
                  </div>
                  {unmatchedNames.length > 0 && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                      <span className="font-medium">Not found:</span>{" "}
                      {unmatchedNames.join(", ")}
                    </div>
                  )}
                </div>
              )}
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
