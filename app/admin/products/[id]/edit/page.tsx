"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Upload, Plus, Trash2 } from "lucide-react";
import React from "react";

interface Color {
  id: string;
  name: string;
  hexCode: string;
}
interface Size {
  id: string;
  name: string;
}
interface Variant {
  id: string;
  colorId: string;
  sizeId: string;
  stock: string | number;
  colorName?: string;
  sizeName?: string;
}
interface Category {
  id: string;
  name: string;
}
interface ProductImageUpload {
  id: string;
  file?: File;
  previewUrl: string;
  colorId: string; // empty means global
  isExisting?: boolean;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const id = React.use(params).id;

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

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
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [resCS, resCat, resProduct] = await Promise.all([
        fetch("/api/admin/colors-sizes"),
        fetch("/api/categories"),
        fetch(`/api/admin/products/${id}`),
      ]);
      const dataCS = await resCS.json();
      const dataCat = await resCat.json();
      const dataProduct = await resProduct.json();

      if (dataCS.success) {
        setColors(dataCS.data.colors);
        setSizes(dataCS.data.sizes);
      }
      if (dataCat.success) {
        setCategories(dataCat.data);
      }
      if (dataProduct.success) {
        const p = dataProduct.data;
        setTitle(p.title);
        setPrice(p.price);
        setCategoryId(p.categoryId || "");

        const totalStock = p.variants.reduce(
          (sum: number, v: { stock: number }) => sum + v.stock,
          0,
        );
        setQuantity(totalStock.toString());

        setVariants(
          p.variants.map(
            (v: {
              id: string;
              colorId: string;
              sizeId: string;
              stock: number;
              color: { name: string };
              size: { name: string };
            }) => ({
              id: v.id,
              colorId: v.colorId,
              sizeId: v.sizeId,
              stock: v.stock,
              colorName: v.color.name,
              sizeName: v.size.name,
            }),
          ),
        );

        if (p.images) {
          setProductImages(
            p.images.map(
              (img: { id: string; url: string; colorId: string | null }) => ({
                id: img.id,
                previewUrl: img.url,
                colorId: img.colorId || "",
                isExisting: true,
              }),
            ),
          );
        }
      }
    } catch (error) {
      console.error("Failed to load edit data:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
        alert(data.error || "Failed to create category");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = files.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        colorId: "",
      }));
      setProductImages((prev) => [...prev, ...newImages]);
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
    if (!selectedColor || !selectedSize || !variantQty) return;

    const colorObj = colors.find((c) => c.id === selectedColor);
    const sizeObj = sizes.find((s) => s.id === selectedSize);

    const qtyToAdd = Number(variantQty);

    const existingVariant = variants.find(
      (v) =>
        v.colorId === selectedColor &&
        v.sizeId === selectedSize
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
            : v
        )
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

    setSelectedColor("");
    setSelectedSize("");
    setVariantQty("");
  };

  const removeVariant = (vid: string) => {
    setVariants(variants.filter((v) => v.id !== vid));
  };

  const handleUpdate = async () => {
    if (!title || !price || variants.length === 0) {
      alert("Please fill required fields and add at least one variant.");
      return;
    }

    if (productImages.length === 0) {
      alert("Please upload at least one image.");
      return;
    }

    setSaving(true);
    try {
      const uploadedImages: { url: string; colorId: string | null }[] = [];

      for (const img of productImages) {
        if (img.isExisting) {
          uploadedImages.push({
            url: img.previewUrl,
            colorId: img.colorId || null,
          });
        } else if (img.file) {
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

      const primaryImage = uploadedImages[0]?.url || "";

      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          price: Number(price),
          image: primaryImage,
          categoryId: categoryId || null,
          variants: variants.map((v) => ({
            colorId: v.colorId,
            sizeId: v.sizeId,
            stock: v.stock,
          })),
          images: uploadedImages,
        }),
      });

      if (res.ok) {
        router.push("/admin/products");
      } else {
        throw new Error("Failed to update product");
      }
    } catch (error) {
      console.error(error);
      alert("Error updating product");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm max-w-4xl min-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4 mb-6">
        <Link
          href="/admin/products"
          className="text-blue-500 hover:text-blue-700"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">
          Edit a Single Product
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Multi-Image Upload */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <label className="block text-sm font-medium text-gray-700">
            Product Images
          </label>
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col items-center justify-center min-h-[150px] cursor-pointer hover:bg-gray-100 transition-colors"
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
                <select
                  value={img.colorId}
                  onChange={(e) =>
                    handleImageColorChange(img.id, e.target.value)
                  }
                  className="w-full border border-gray-200 rounded p-1 text-xs bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Global (Default)</option>
                  {colors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        <div className="w-full md:w-2/3 flex flex-col gap-6">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category selection */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm text-gray-700 mb-1 font-medium">
              Category
            </label>
            <div className="flex gap-3 items-center">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex-1 border border-gray-200 rounded p-2.5 text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="text-gray-400 text-sm">or</span>
              <input
                type="text"
                placeholder="New Category Name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="bg-blue-500 text-white px-4 py-2.5 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>

          {/* Variants section */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <label className="block text-sm text-gray-700 mb-1 font-medium">
              Add Product Variants
            </label>
            <div className="flex items-center gap-3">
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="flex-1 border border-gray-200 rounded p-2 text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Color</option>
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="flex-1 border border-gray-200 rounded p-2 text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Size</option>
                {sizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={variantQty}
                onChange={(e) => setVariantQty(e.target.value)}
                placeholder="Enter Qty"
                className="flex-1 border border-gray-200 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={addVariant}
                className="w-9 h-9 border border-blue-200 text-blue-500 rounded flex items-center justify-center hover:bg-blue-50 transition-colors shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Added variants list */}
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
                    value={variant.stock}
                    onChange={(e) => {
                      const updated = variants.map((v) =>
                        v.id === variant.id
                          ? { ...v, stock: e.target.value }
                          : v,
                      );
                      setVariants(updated);
                    }}
                    className="w-full focus:outline-none"
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

          <div className="flex justify-end mt-4">
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="bg-blue-500 text-white font-medium py-2 px-8 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {saving ? "Updating..." : "Update"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
