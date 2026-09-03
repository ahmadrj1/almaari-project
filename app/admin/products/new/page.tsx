"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Upload, Plus, Trash2 } from "lucide-react";
import {
  Color,
  Size,
  FormVariant as Variant,
  Category,
  ProductImageUpload,
} from "@/types";
import { MAX_UPLOAD_SIZE } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { SortDropdown } from "@/components/ui/sort-dropdown";

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Price must be greater than 0",
    }),
  categoryId: z.string().min(1, "Category is required"),
});
export default function AddProductPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [variantQty, setVariantQty] = useState("");

  const [productImages, setProductImages] = useState<ProductImageUpload[]>([]);

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
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
      console.error("Failed to fetch colors, sizes, and categories:", error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories((prev) => [...prev, data.data]);
        setCategoryId(data.data.id);
        setNewCategoryName("");
      } else {
        showToast("error", data.error || "Failed to create category");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Error creating category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      const invalidTypes = files.filter(
        (f) =>
          !["image/jpeg", "image/jpg", "image/png"].includes(f.type) &&
          !/\.(jpe?g|png)$/i.test(f.name),
      );
      if (invalidTypes.length > 0) {
        showToast("error", "Only JPG, JPEG, and PNG images are allowed.");
        return;
      }

      const invalidFiles = files.filter((f) => f.size > MAX_UPLOAD_SIZE);
      if (invalidFiles.length > 0) {
        showToast("error", "Image upload size is max 10MB.");
      }
      const validFiles = files.filter((f) => f.size <= MAX_UPLOAD_SIZE);
      const newImages = validFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        colorId: "",
      }));
      setProductImages((prev) => [...prev, ...newImages]);
      setErrors((prev) => ({ ...prev, images: "" }));
    }
  };

  const handleImageColorChange = (id: string, colorId: string) => {
    setProductImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, colorId } : img)),
    );
  };

  const handleRemoveImage = (id: string) => {
    setProductImages((prev) => prev.filter((img) => img.id !== id));
  };

  const addVariant = () => {
    if (
      !selectedColor ||
      !selectedSize ||
      !variantQty ||
      Number(variantQty) <= 0
    ) {
      showToast("error", "Please select color, size, and quantity (> 0)");
      return;
    }

    const colorObj = colors.find((c) => c.id === selectedColor);
    const sizeObj = sizes.find((s) => s.id === selectedSize);

    const qtyToAdd = Number(variantQty);

    const existingVariant = variants.find(
      (v) => v.colorId === selectedColor && v.sizeId === selectedSize,
    );

    if (existingVariant) {
      // Merge duplicate variant stock
      setVariants((prev) =>
        prev.map((v) =>
          v.id === existingVariant.id
            ? {
                ...v,
                stock: Number(v.stock) + qtyToAdd,
              }
            : v,
        ),
      );
    } else {
      // Add new variant
      setVariants((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          colorId: selectedColor,
          sizeId: selectedSize,
          stock: qtyToAdd,
          colorName: colorObj?.name,
          sizeName: sizeObj?.name,
        },
      ]);
    }

    setSelectedSize("");
    setVariantQty("");
    setErrors((prev) => ({ ...prev, variants: "" }));
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const totalQuantity = variants.reduce(
    (sum, v) => sum + Number(v.stock || 0),
    0,
  );

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    const effectiveCategoryId =
      categoryId === "create_new" ? newCategoryName : categoryId;

    const result = formSchema.safeParse({
      title,
      price,
      categoryId: effectiveCategoryId,
    });

    if (!result.success) {
      result.error.issues.forEach((err) => {
        if (err.path[0] && !newErrors[err.path[0] as string]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
    }

    if (productImages.length === 0) {
      newErrors.images = "At least one image is required";
    }

    if (variants.length === 0) {
      newErrors.variants = "At least one variant is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    setSaving(true);
    try {
      const uploadedImages: { url: string; colorId: string | null }[] = [];

      for (const img of productImages) {
        if (img.file) {
          const formData = new FormData();
          formData.append("file", img.file);
          formData.append("title", `${title}-${img.colorId || "default"}`);

          const uploadRes = await fetch("/api/admin/upload", {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success) {
            uploadedImages.push({
              url: uploadData.imagePath,
              colorId: img.colorId || null,
            });
          } else {
            throw new Error("Image upload failed");
          }
        }
      }

      // First image or first default image will be primary
      const primaryImage = uploadedImages[0]?.url || "";

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          price: Number(price),
          image: primaryImage,
          categoryId:
            categoryId && categoryId !== "create_new" ? categoryId : null,
          variants: variants.map((v) => ({
            colorId: v.colorId,
            sizeId: v.sizeId,
            stock: v.stock,
          })),
          images: uploadedImages, // Include multi-image array
        }),
      });

      if (res.ok) {
        showToast("success", "Product added successfully!");
        router.push("/admin/products");
      } else {
        throw new Error("Failed to save product");
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Error saving product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm w-full min-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4 mb-6">
        <Link
          href="/admin/products"
          className="text-blue-500 hover:text-blue-700"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">
          Add a Single Product
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Multi-Image Upload */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <label className="block text-sm font-medium text-gray-700">
            Product Images <span className="text-red-500">*</span>
          </label>
          <div
            className={`border-2 border-dashed ${errors.images ? "border-red-500 bg-red-50/50 ring-1 ring-red-500" : "border-gray-200 bg-gray-50"} rounded-lg p-4 flex flex-col items-center justify-center min-h-[150px] cursor-pointer hover:bg-gray-100 transition-colors`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="text-gray-400 mb-2" />
            <span className="text-xs text-gray-500">
              Upload multiple images
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAddImage}
              className="hidden"
              accept="image/*"
              multiple
            />
          </div>
          {errors.images && (
            <span className="text-xs text-red-500 block">{errors.images}</span>
          )}

          <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-1">
            {productImages.map((img) => (
              <div
                key={img.id}
                className="border border-gray-100 p-2 rounded-lg bg-white shadow-sm flex flex-col gap-2 relative"
              >
                <button
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors z-10"
                >
                  &times;
                </button>
                <div className="relative aspect-video w-full bg-gray-100 rounded-md overflow-hidden">
                  <Image
                    src={img.previewUrl}
                    alt="Preview"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <SortDropdown
                  className="w-full"
                  buttonClassName="h-9 rounded-md px-2 text-xs"
                  menuClassName="max-h-56"
                  value={img.colorId}
                  placeholder="Global (Default)"
                  options={colors.map((c) => ({
                    label: c.name,
                    value: c.id,
                  }))}
                  onValueChange={(value) =>
                    handleImageColorChange(img.id, value)
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6 min-w-0">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
              }}
              placeholder="e.g. Cargo Trousers for Men"
              className={`w-full border ${errors.title ? "border-red-500 ring-1 ring-red-500" : "border-gray-200"} rounded p-2.5 text-sm focus:outline-none focus:border-blue-500`}
            />
            {errors.title && (
              <span className="text-xs text-red-500 mt-1 block">
                {errors.title}
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || Number(val) >= 0) {
                    setPrice(val);
                    if (errors.price)
                      setErrors((prev) => ({ ...prev, price: "" }));
                  }
                }}
                placeholder="$00.00"
                className={`w-full border ${errors.price ? "border-red-500 ring-1 ring-red-500" : "border-gray-200"} rounded p-2.5 text-sm focus:outline-none focus:border-blue-500`}
              />
              {errors.price && (
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.price}
                </span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">
                Total Quantity
              </label>
              <input
                type="number"
                value={totalQuantity}
                readOnly
                placeholder="Calculated automatically"
                className="w-full border border-gray-200 rounded p-2.5 text-sm bg-gray-50 text-gray-500 focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-sm text-gray-700 mb-1 font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <SortDropdown
                className={`w-full min-w-0 ${errors.categoryId ? "ring-1 ring-red-500 rounded-lg" : ""}`}
                buttonClassName={`rounded-lg py-2.5 text-sm ${errors.categoryId ? "border-red-500" : "border-gray-200"}`}
                menuClassName="max-h-56"
                value={categoryId}
                placeholder="Select Category"
                options={[
                  ...categories.map((c) => ({
                    label: c.name,
                    value: c.id,
                  })),
                  {
                    label: (
                      <span className="font-semibold text-blue-600">
                        + Create New Category
                      </span>
                    ),
                    value: "create_new",
                  },
                ]}
                onValueChange={(value) => {
                  setCategoryId(value);
                  if (errors.categoryId)
                    setErrors((prev) => ({ ...prev, categoryId: "" }));
                  if (value !== "create_new") {
                    setNewCategoryName("");
                  }
                }}
              />
            </div>

            {categoryId === "create_new" && (
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] mt-5">
                <input
                  type="text"
                  placeholder="Category name…"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={`animate-slide-in w-full min-w-0 border ${errors.categoryId ? "border-red-500" : "border-gray-200"} rounded-lg bg-white p-2.5 text-sm focus:outline-none focus:border-blue-500`}
                  autoFocus
                />
                <button
                  onClick={handleCreateCategory}
                  disabled={isCreatingCategory || !newCategoryName.trim()}
                  className="animate-slide-in w-full xl:w-auto bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  Create
                </button>
              </div>
            )}
            {errors.categoryId && (
              <span className="text-xs text-red-500">{errors.categoryId}</span>
            )}
          </div>

          {/* Variants section */}
          <div
            className={`space-y-3 border-t border-gray-100 pt-4 ${errors.variants ? "rounded-lg border-2 border-red-500 p-2.5 bg-red-50/20 ring-1 ring-red-500" : ""}`}
          >
            <label className="block text-sm text-gray-700 mb-1 font-medium">
              Add Product Variants <span className="text-red-500">*</span>
            </label>
            {errors.variants && (
              <span className="text-xs text-red-500 block mb-2">
                {errors.variants}
              </span>
            )}
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <SortDropdown
                className="w-full min-w-0"
                buttonClassName="rounded p-2 text-sm h-10"
                menuClassName="max-h-56"
                value={selectedColor}
                placeholder="Select Color"
                options={colors.map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
                onValueChange={setSelectedColor}
              />
              <SortDropdown
                className="w-full min-w-0"
                buttonClassName="rounded p-2 text-sm h-10"
                menuClassName="max-h-56"
                value={selectedSize}
                placeholder="Select Size"
                options={sizes.map((s) => ({
                  label: s.name,
                  value: s.id,
                }))}
                onValueChange={setSelectedSize}
              />
              <input
                type="number"
                min="0"
                value={variantQty}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || Number(val) >= 0) {
                    setVariantQty(val);
                  }
                }}
                placeholder="Enter Qty"
                className="w-full min-w-0 border border-gray-200 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={addVariant}
                className={`w-full xl:w-9 h-9 border rounded flex items-center justify-center transition-colors shrink-0 ${
                  selectedColor && selectedSize && variantQty
                    ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                    : "border-blue-200 text-blue-500 hover:bg-blue-50"
                }`}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Added variants list */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="grid gap-3 bg-gray-50 p-2 rounded md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0 text-sm text-gray-600 px-2 py-1 bg-white border border-gray-200 rounded">
                    {variant.colorName}
                  </div>
                  <div className="min-w-0 text-sm text-gray-600 px-2 py-1 bg-white border border-gray-200 rounded">
                    {variant.sizeName}
                  </div>
                  <div className="min-w-0 text-sm text-gray-600 px-2 py-1 bg-white border border-gray-200 rounded">
                    {variant.stock}
                  </div>
                  <button
                    onClick={() => removeVariant(variant.id)}
                    className="w-full md:w-9 h-9 border border-red-200 text-red-500 rounded flex items-center justify-center hover:bg-red-50 transition-colors shrink-0 bg-white"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-500 text-white font-medium py-2 px-8 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
