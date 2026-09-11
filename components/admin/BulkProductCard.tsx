"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import Image from "next/image";
import { Upload, Plus, Trash2 } from "lucide-react";
import {
  Color,
  Size,
  FormVariant as Variant,
  Category,
  ProductImageUpload,
} from "@/types";
import { MAX_UPLOAD_SIZE } from "@/lib/constants";
import { SortDropdown } from "@/components/ui/sort-dropdown";
import { z } from "zod";
import { ParsedCSVProduct } from "@/lib/csv-parser";

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

export interface BulkProductCardRef {
  validate: () => boolean;
  getData: () => {
    id: string;
    title: string;
    description: string;
    price: string;
    categoryId: string;
    categoryName: string;
    variants: Variant[];
    productImages: ProductImageUpload[];
  };
  scrollIntoView: () => void;
}

interface BulkProductCardProps {
  index: number;
  initialData: ParsedCSVProduct;
  colors: Color[];
  sizes: Size[];
  categories: Category[];
  onRemove: (id: string) => void;
  onCategoryCreated: (newCat: Category) => void;
}

const BulkProductCard = forwardRef<BulkProductCardRef, BulkProductCardProps>(
  (
    {
      index,
      initialData,
      colors,
      sizes,
      categories,
      onRemove,
      onCategoryCreated,
    },
    ref,
  ) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState(initialData.title || "");
    const [price, setPrice] = useState(initialData.price || "");
    const [description] = useState(initialData.description || "");

    const matchedCategory = categories.find(
      (c) =>
        c.name.toLowerCase() === (initialData.categoryName || "").toLowerCase(),
    );
    const [categoryId, setCategoryId] = useState(
      matchedCategory ? matchedCategory.id : "",
    );
    const [newCategoryName, setNewCategoryName] = useState(
      matchedCategory ? "" : initialData.categoryName || "",
    );
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);

    const [variants, setVariants] = useState<Variant[]>(() => {
      if (!initialData.variants || initialData.variants.length === 0) return [];
      return initialData.variants.map((v, i) => {
        const foundColor = colors.find(
          (c) =>
            c.name.trim().toLowerCase() ===
            (v.colorName || "").trim().toLowerCase(),
        );
        const foundSize = sizes.find(
          (s) =>
            s.name.trim().toLowerCase() ===
            (v.sizeName || "").trim().toLowerCase(),
        );
        return {
          id: `var-${i}-${Date.now()}`,
          colorId: foundColor ? foundColor.id : colors[0]?.id || "",
          colorName: foundColor
            ? foundColor.name
            : v.colorName || colors[0]?.name || "Default",
          sizeId: foundSize ? foundSize.id : sizes[0]?.id || "",
          sizeName: foundSize
            ? foundSize.name
            : v.sizeName || sizes[0]?.name || "Standard",
          stock: Number(v.stock) || 0,
        };
      });
    });

    const [selectedColor, setSelectedColor] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    const [variantQty, setVariantQty] = useState("");

    const resolveColorId = useCallback(
      (colorName?: string): string => {
        if (!colorName) return "";
        const clean = colorName.trim().toLowerCase();
        const byName = colors.find(
          (c) => c.name.trim().toLowerCase() === clean,
        );
        if (byName) return byName.id;
        const byId = colors.find((c) => c.id === colorName.trim());
        if (byId) return byId.id;
        const fromVariant = initialData.variants?.find(
          (v) => (v.colorName || "").trim().toLowerCase() === clean,
        );
        if (fromVariant) {
          const found = colors.find(
            (c) =>
              c.name.trim().toLowerCase() ===
              (fromVariant.colorName || "").trim().toLowerCase(),
          );
          if (found) return found.id;
        }
        return "";
      },
      [colors, initialData.variants],
    );

    const [productImages, setProductImages] = useState<ProductImageUpload[]>(
      () => {
        if (
          initialData.resolvedImages &&
          initialData.resolvedImages.length > 0
        ) {
          return initialData.resolvedImages.map((r, i) => ({
            id: `resolved-${i}-${Date.now()}`,
            file: r.file,
            previewUrl: URL.createObjectURL(r.file),
            colorId: resolveColorId(r.colorName),
          }));
        }
        return [];
      },
    );

    useEffect(() => {
      if (
        colors.length > 0 &&
        initialData.resolvedImages &&
        initialData.resolvedImages.length > 0
      ) {
        setProductImages((prev) => {
          if (prev.length === 0) {
            return initialData.resolvedImages!.map((r, i) => ({
              id: `resolved-${i}-${Date.now()}`,
              file: r.file,
              previewUrl: URL.createObjectURL(r.file),
              colorId: resolveColorId(r.colorName),
            }));
          }

          const hasUnlinked = prev.some((img) => !img.colorId);
          if (!hasUnlinked) return prev;

          return prev.map((img, idx) => {
            if (img.colorId) return img;
            const r = initialData.resolvedImages?.[idx];
            if (!r) return img;
            const matchedId = resolveColorId(r.colorName);
            return matchedId ? { ...img, colorId: matchedId } : img;
          });
        });
      }
    }, [colors, initialData.resolvedImages, resolveColorId]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const clearError = (key: string) => {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

    useEffect(() => {
      if (initialData.categoryName && !matchedCategory) {
        const cat = categories.find(
          (c) =>
            c.name.toLowerCase() === initialData.categoryName.toLowerCase(),
        );
        if (cat) {
          setCategoryId(cat.id);
        }
      }
    }, [categories, initialData.categoryName, matchedCategory]);

    useImperativeHandle(ref, () => ({
      validate: () => {
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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
      },
      getData: () => ({
        id: initialData.id,
        title: title.trim(),
        description: description.trim(),
        price: price.trim(),
        categoryId: categoryId === "create_new" ? "" : categoryId,
        categoryName:
          categoryId === "create_new"
            ? newCategoryName.trim()
            : categories.find((c) => c.id === categoryId)?.name ||
              newCategoryName.trim(),
        variants,
        productImages,
      }),
      scrollIntoView: () => {
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      },
    }));

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
          onCategoryCreated(data.data);
          setCategoryId(data.data.id);
          setNewCategoryName("");
          clearError("categoryId");
        }
      } catch (e) {
        console.error(e);
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
          alert("Only JPG, JPEG, and PNG images are allowed.");
          return;
        }

        const invalidFiles = files.filter((f) => f.size > MAX_UPLOAD_SIZE);
        if (invalidFiles.length > 0) {
          alert("Image upload size is max 10MB.");
        }
        const validFiles = files.filter((f) => f.size <= MAX_UPLOAD_SIZE);
        const newImages = validFiles.map((file) => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          previewUrl: URL.createObjectURL(file),
          colorId: "",
        }));
        setProductImages((prev) => [...prev, ...newImages]);
        clearError("images");
      }
    };

    const handleImageColorChange = (imgId: string, colorId: string) => {
      setProductImages((prev) =>
        prev.map((img) => (img.id === imgId ? { ...img, colorId } : img)),
      );
    };

    const handleRemoveImage = (imgId: string) => {
      setProductImages((prev) => prev.filter((img) => img.id !== imgId));
    };

    const addVariant = () => {
      if (
        !selectedColor ||
        !selectedSize ||
        !variantQty ||
        Number(variantQty) <= 0
      ) {
        return;
      }

      const colorObj = colors.find((c) => c.id === selectedColor);
      const sizeObj = sizes.find((s) => s.id === selectedSize);
      const qtyToAdd = Number(variantQty);

      const existingVariant = variants.find(
        (v) => v.colorId === selectedColor && v.sizeId === selectedSize,
      );

      if (existingVariant) {
        setVariants((prev) =>
          prev.map((v) =>
            v.id === existingVariant.id
              ? { ...v, stock: Number(v.stock) + qtyToAdd }
              : v,
          ),
        );
      } else {
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
      clearError("variants");
    };

    const removeVariant = (vid: string) => {
      setVariants((prev) => prev.filter((v) => v.id !== vid));
    };

    const totalQuantity = variants.reduce(
      (sum, v) => sum + Number(v.stock || 0),
      0,
    );

    const hasErrors = Object.values(errors).some((err) =>
      Boolean(err && err.trim()),
    );

    return (
      <div
        ref={cardRef}
        className={`bg-white rounded-lg p-6 shadow-sm border ${
          hasErrors ? "border-red-500 ring-1 ring-red-500" : "border-gray-200"
        } transition-all relative`}
      >
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-sm flex items-center justify-center">
              #{index + 1}
            </span>
            <h2 className="text-xl font-semibold text-slate-800">
              {title || "Untitled Product"}
            </h2>
          </div>
          <button
            onClick={() => onRemove(initialData.id)}
            className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
            title="Remove Product"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left: Multi-Image Upload */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Product Images <span className="text-red-500">*</span>
            </label>
            <div
              className={`border-2 border-dashed ${
                errors.images
                  ? "border-red-500 bg-red-50/50 ring-1 ring-red-500"
                  : "border-gray-200 bg-gray-50"
              } rounded-lg p-4 flex flex-col items-center justify-center min-h-[150px] cursor-pointer hover:bg-gray-100 transition-colors`}
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
              <span className="text-xs text-red-500 block">
                {errors.images}
              </span>
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
          <div className="w-full md:w-2/3 flex flex-col gap-6">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearError("title");
                }}
                placeholder="e.g. Cargo Trousers for Men"
                className={`w-full border ${
                  errors.title
                    ? "border-red-500 ring-1 ring-red-500"
                    : "border-gray-200"
                } rounded p-2.5 text-sm focus:outline-none focus:border-blue-500`}
              />
              {errors.title && (
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.title}
                </span>
              )}
            </div>

            <div className="flex gap-4">
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
                      clearError("price");
                    }
                  }}
                  placeholder="$00.00"
                  className={`w-full border ${
                    errors.price
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-gray-200"
                  } rounded p-2.5 text-sm focus:outline-none focus:border-blue-500`}
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
                  className={`w-full min-w-0 ${
                    errors.categoryId ? "ring-1 ring-red-500 rounded-lg" : ""
                  }`}
                  buttonClassName={`rounded-lg py-2.5 text-sm ${
                    errors.categoryId ? "border-red-500" : "border-gray-200"
                  }`}
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
                    clearError("categoryId");
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
                    className={`animate-slide-in w-full min-w-0 border ${
                      errors.categoryId ? "border-red-500" : "border-gray-200"
                    } rounded-lg bg-white p-2.5 text-sm focus:outline-none focus:border-blue-500`}
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
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.categoryId}
                </span>
              )}
            </div>

            {/* Variants section */}
            <div
              className={`space-y-3 border-t border-gray-100 pt-3 ${
                errors.variants
                  ? "rounded-lg border-2 border-red-500 p-2.5 bg-red-50/20 ring-1 ring-red-500"
                  : ""
              }`}
            >
              <label className="block text-sm text-gray-700 mb-1 font-medium">
                Add Product Variants <span className="text-red-500">*</span>
              </label>
              {errors.variants && (
                <span className="text-xs text-red-500 block mb-2">
                  {errors.variants}
                </span>
              )}
              <div className="flex items-center gap-3">
                <SortDropdown
                  className="flex-1 min-w-0"
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
                  className="flex-1 min-w-0"
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
                  className="flex-1 border border-gray-200 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={addVariant}
                  className={`w-9 h-9 border rounded flex items-center justify-center transition-colors shrink-0 ${
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
                    className="flex items-center gap-3 bg-gray-50 p-2 rounded"
                  >
                    <div className="flex-1 text-sm text-gray-600 px-2 py-1 bg-white border border-gray-200 rounded">
                      {variant.colorName}
                    </div>
                    <div className="flex-1 text-sm text-gray-600 px-2 py-1 bg-white border border-gray-200 rounded">
                      {variant.sizeName}
                    </div>
                    <div className="flex-1 text-sm text-gray-600 px-2 py-1 bg-white border border-gray-200 rounded">
                      <input
                        type="number"
                        min="0"
                        value={variant.stock}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || Number(val) >= 0) {
                            const updated = variants.map((v) =>
                              v.id === variant.id
                                ? { ...v, stock: Number(val) }
                                : v,
                            );
                            setVariants(updated);
                          }
                        }}
                        className="w-full focus:outline-none bg-transparent"
                      />
                    </div>
                    <button
                      onClick={() => removeVariant(variant.id)}
                      className="w-9 h-9 border border-red-200 text-red-500 rounded flex items-center justify-center hover:bg-red-50 transition-colors shrink-0 bg-white"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

BulkProductCard.displayName = "BulkProductCard";

export default BulkProductCard;
