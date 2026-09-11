"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Plus, Upload, Loader2 } from "lucide-react";
import { Color, Size, Category } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ParsedCSVProduct } from "@/lib/csv-parser";
import BulkProductCard, {
  BulkProductCardRef,
} from "@/components/admin/BulkProductCard";
import { resolvedImageStore } from "@/lib/resolved-image-store";

export default function BulkAddProductsView() {
  const router = useRouter();
  const { showToast } = useToast();

  const [products, setProducts] = useState<ParsedCSVProduct[]>(() => {
    try {
      const draftStr =
        typeof window !== "undefined"
          ? sessionStorage.getItem("bulk_products_draft")
          : null;
      if (!draftStr) return [];
      const parsed: ParsedCSVProduct[] = JSON.parse(draftStr);
      // Re-attach resolved images from module-level store (not JSON-serializable)
      return parsed.map((p) => ({
        ...p,
        resolvedImages: resolvedImageStore.get(p.id),
      }));
    } catch {
      return [];
    }
  });
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    current: number;
    status: string;
  } | null>(null);

  const cardRefs = useRef<Map<string, BulkProductCardRef>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resCS, resCat] = await Promise.all([
          fetch("/api/admin/colors-sizes"),
          fetch("/api/categories"),
        ]);
        const dataCS = await resCS.json();
        const dataCat = await resCat.json();

        if (dataCS.success) {
          setColors(dataCS.data.colors);
          setSizes(dataCS.data.sizes);
        }
        if (dataCat.success) {
          setCategories(dataCat.data);
        }
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRemoveProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    cardRefs.current.delete(id);
  };

  const handleAddNewBlankProduct = () => {
    const newProd: ParsedCSVProduct = {
      id: Math.random().toString(36).substring(2, 9),
      title: "",
      description: "",
      price: "",
      categoryName: "",
      variants: [],
    };
    setProducts((prev) => [...prev, newProd]);
  };

  const handleSubmitAll = async () => {
    if (products.length === 0) {
      showToast("error", "No products to submit.");
      return;
    }

    let firstInvalidRef: BulkProductCardRef | null = null;
    let isValidAll = true;

    for (const prod of products) {
      const ref = cardRefs.current.get(prod.id);
      if (ref) {
        const isValid = ref.validate();
        if (!isValid) {
          isValidAll = false;
          if (!firstInvalidRef) {
            firstInvalidRef = ref;
          }
        }
      }
    }

    if (!isValidAll && firstInvalidRef) {
      showToast("error", "Please fix the invalid fields highlighted in red.");
      firstInvalidRef.scrollIntoView();
      return;
    }

    setSubmitting(true);

    // Calculate total files to upload for progress tracking
    let totalFiles = 0;
    for (const prod of products) {
      const ref = cardRefs.current.get(prod.id);
      if (!ref) continue;
      const data = ref.getData();
      totalFiles += data.productImages.filter((img) =>
        Boolean(img.file),
      ).length;
    }

    setUploadProgress({
      total: totalFiles,
      current: 0,
      status:
        totalFiles > 0
          ? `Starting upload of ${totalFiles} image${totalFiles > 1 ? "s" : ""}...`
          : "Preparing products...",
    });

    try {
      const formattedProducts = [];
      let uploadedFilesCount = 0;

      for (const prod of products) {
        const ref = cardRefs.current.get(prod.id);
        if (!ref) continue;
        const data = ref.getData();

        const uploadedImageUrls: string[] = [];
        for (const img of data.productImages) {
          if (img.file) {
            const formData = new FormData();
            formData.append("file", img.file);
            formData.append("title", `${data.title}-bulk`);

            const uploadRes = await fetch("/api/admin/upload", {
              method: "POST",
              body: formData,
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
              uploadedImageUrls.push(uploadData.imagePath);
            }
            uploadedFilesCount++;
            setUploadProgress({
              total: totalFiles,
              current: uploadedFilesCount,
              status: `Uploading images (${uploadedFilesCount}/${totalFiles})...`,
            });
          } else if (img.previewUrl) {
            uploadedImageUrls.push(img.previewUrl);
          }
        }

        const mainImage =
          uploadedImageUrls[0] ||
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30";

        formattedProducts.push({
          title: data.title,
          description: data.description,
          price: Number(data.price),
          image: mainImage,
          categoryName: data.categoryName,
          variants: data.variants.map((v) => ({
            colorName: v.colorName,
            sizeName: v.sizeName,
            stock: v.stock,
          })),
          images: data.productImages.map((imgUpload, idx) => {
            const colorObj = colors.find((c) => c.id === imgUpload.colorId);
            return {
              url: uploadedImageUrls[idx] || imgUpload.previewUrl,
              colorName: colorObj ? colorObj.name : undefined,
              sortOrder: idx,
            };
          }),
        });
      }

      setUploadProgress({
        total: totalFiles,
        current: totalFiles,
        status: "Dispatching to Background Server queue...",
      });

      const res = await fetch("/api/admin/products/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: formattedProducts }),
      });

      const resData = await res.json();

      if (res.ok && resData.success) {
        sessionStorage.removeItem("bulk_products_draft");
        showToast(
          "success",
          `Successfully queued ${formattedProducts.length} products to Background Job Server!`,
        );
        router.push("/admin/products");
      } else {
        throw new Error(resData.error || "Failed to queue bulk upload job");
      }
    } catch (error) {
      console.error("Bulk submission error:", error);
      showToast(
        "error",
        error instanceof Error ? error.message : "Error submitting products",
      );
    } finally {
      setUploadProgress(null);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-12 text-center text-slate-500 min-h-[calc(100vh-8rem)] flex items-center justify-center">
        Loading metadata...
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-8rem)] px-6 rounded-xl space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-40 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Bulk Add Products ({products.length})
            </h1>
            <p className="text-xs text-slate-500">
              Review pre-filled CSV data, add images, edit details, then submit
              to queue tasks.
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={handleAddNewBlankProduct}
            className="flex-1 sm:flex-none border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Product Card
          </button>
          <button
            onClick={handleSubmitAll}
            disabled={submitting || products.length === 0}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {submitting ? "Submitting to Queue..." : "Submit All Products"}
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="text-slate-400 font-medium">
            No products found in draft. Upload a CSV file to get started.
          </div>
          <Link
            href="/admin/products"
            className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Go back to Products
          </Link>
        </div>
      ) : (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
          {products.map((product, idx) => (
            <BulkProductCard
              key={product.id}
              ref={(el) => {
                if (el) cardRefs.current.set(product.id, el);
                else cardRefs.current.delete(product.id);
              }}
              index={idx}
              initialData={product}
              colors={colors}
              sizes={sizes}
              categories={categories}
              onRemove={handleRemoveProduct}
              onCategoryCreated={(newCat) => {
                setCategories((prev) => [...prev, newCat]);
              }}
            />
          ))}
        </div>
      )}

      {uploadProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              {uploadProgress.current < uploadProgress.total ||
              uploadProgress.total === 0 ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Upload size={24} className="animate-bounce" />
              )}
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Processing Bulk Upload
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {uploadProgress.status}
              </p>
            </div>

            {uploadProgress.total > 0 && (
              <div className="space-y-2 pt-1">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.round(
                        (uploadProgress.current / uploadProgress.total) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>
                    {uploadProgress.current} of {uploadProgress.total} images
                  </span>
                  <span>
                    {Math.round(
                      (uploadProgress.current / uploadProgress.total) * 100,
                    )}
                    %
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
