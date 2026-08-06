"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Edit2, Plus, Trash2 } from "lucide-react";
import React from "react";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const id = React.use(params).id;

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  
  const [colors, setColors] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [variantQty, setVariantQty] = useState("");
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchColorsAndSizes();
    fetchProduct();
  }, [id]);

  const fetchColorsAndSizes = async () => {
    try {
      const res = await fetch("/api/admin/colors-sizes");
      const data = await res.json();
      if (data.success) {
        setColors(data.data.colors);
        setSizes(data.data.sizes);
      }
    } catch (error) {
      console.error("Failed to fetch colors and sizes:", error);
    }
  };

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/admin/products/${id}`);
      const data = await res.json();
      if (data.success) {
        const p = data.data;
        setTitle(p.title);
        setPrice(p.price);
        setOriginalImage(p.image);
        setImagePreview(p.image);
        
        // Calculate total quantity from variants
        const totalStock = p.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
        setQuantity(totalStock.toString());
        
        setVariants(p.variants.map((v: any) => ({
          id: v.id,
          colorId: v.colorId,
          sizeId: v.sizeId,
          stock: v.stock,
          colorName: v.color.name,
          sizeName: v.size.name
        })));
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const addVariant = () => {
    if (!selectedColor || !selectedSize || !variantQty) return;
    
    const colorObj = colors.find(c => c.id === selectedColor);
    const sizeObj = sizes.find(s => s.id === selectedSize);
    
    setVariants([...variants, {
      id: Date.now().toString(), // temporary id
      colorId: selectedColor,
      sizeId: selectedSize,
      stock: variantQty,
      colorName: colorObj?.name,
      sizeName: sizeObj?.name
    }]);
    
    setSelectedColor("");
    setSelectedSize("");
    setVariantQty("");
  };

  const removeVariant = (vid: string) => {
    setVariants(variants.filter(v => v.id !== vid));
  };

  const handleUpdate = async () => {
    if (!title || !price || variants.length === 0) {
      alert("Please fill required fields and add at least one variant.");
      return;
    }

    setSaving(true);
    try {
      let imagePath = originalImage;
      
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("title", title);
        
        const uploadRes = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          imagePath = uploadData.imagePath;
        } else {
          throw new Error("Image upload failed");
        }
      }

      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          price: Number(price),
          image: imagePath,
          variants: variants.map(v => ({ colorId: v.colorId, sizeId: v.sizeId, stock: v.stock }))
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm max-w-4xl min-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4 mb-6">
        <Link href="/admin/products" className="text-blue-500 hover:text-blue-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">Edit a Single Product</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Image Upload */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="relative border border-gray-200 rounded-lg h-64 flex flex-col items-center justify-center bg-gray-50 overflow-hidden">
            {imagePreview ? (
              <>
                <Image src={imagePreview} alt="Preview" fill className="object-cover" unoptimized />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute top-2 right-2 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors shadow-sm"
                >
                  <Edit2 size={16} />
                </button>
              </>
            ) : (
              <span className="text-sm text-gray-400">No Image</span>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            className="hidden" 
            accept="image/*" 
          />
        </div>

        {/* Right: Form */}
        <div className="w-full md:w-2/3 flex flex-col gap-6">
          
          <div>
            <label className="block text-sm text-gray-700 mb-1">Product Name</label>
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
              <label className="block text-sm text-gray-700 mb-1">Quantity</label>
              <input 
                type="number" 
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Variants section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <select 
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="flex-1 border border-gray-200 rounded p-2 text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Color</option>
                {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select 
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="flex-1 border border-gray-200 rounded p-2 text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Size</option>
                {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            {variants.map(variant => (
              <div key={variant.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded">
                <div className="flex-1 text-sm text-gray-600 px-2 py-1 bg-white border border-gray-200 rounded">{variant.colorName}</div>
                <div className="flex-1 text-sm text-gray-600 px-2 py-1 bg-white border border-gray-200 rounded">{variant.sizeName}</div>
                <div className="flex-1 text-sm text-gray-600 px-2 py-1 bg-white border border-gray-200 rounded">
                  <input 
                    type="number" 
                    value={variant.stock}
                    onChange={(e) => {
                      const updated = variants.map(v => v.id === variant.id ? { ...v, stock: e.target.value } : v);
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
