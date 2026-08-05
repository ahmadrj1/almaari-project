"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trash2, ArrowLeft, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import type { CartItemWithProduct } from "@/types";
import { useCartCount } from "@/hooks/use-cart-count";

export default function CartPage() {
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [address, setAddress] = useState("");
  const router = useRouter();
  const { showToast } = useToast();
  const { decrement, refresh } = useCartCount();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, quantity }),
      });
      const data = await res.json();
      if (data.success) {
        if (quantity <= 0) {
          setItems(items.filter((i) => i.id !== cartItemId));
          decrement();
        } else {
          setItems(
            items.map((i) =>
              i.id === cartItemId ? { ...i, quantity: data.data.quantity } : i
            )
          );
        }
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Failed to update quantity");
    }
  };

  const deleteItem = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId: itemToDelete }),
      });
      if (res.ok) {
        setItems(items.filter((i) => i.id !== itemToDelete));
        decrement();
        showToast("success", "Item removed from cart");
      }
    } catch (error) {
      showToast("error", "Failed to remove item");
    } finally {
      setItemToDelete(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      showToast("error", "Please enter delivery address");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.success) {
        setItems([]);
        setIsAddressModalOpen(false);
        setAddress("");
        refresh();
        showToast("success", "Awesome, Your order has been placed successfully.");
      } else {
        showToast("error", data.error || "Failed to place order");
      }
    } catch (error) {
      showToast("error", "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-2xl font-semibold text-blue-600 flex items-center gap-2 mb-8">
          <Link href="/products" className="hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          Your Shopping Bag
        </h1>
        <EmptyState
          icon={<AlertTriangle className="w-12 h-12 text-gray-400" />}
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet."
          action={
            <Button onClick={() => router.push("/products")}>Browse Products</Button>
          }
        />
      </div>
    );
  }

  const subTotal = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );
  const tax = subTotal * 0.1;
  const total = subTotal + tax;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-semibold text-blue-600 flex items-center gap-2 mb-8">
        <Link href="/products" className="hover:text-blue-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        Your Shopping Bag
      </h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
                <th className="p-4 w-12"><input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" /></th>
                <th className="p-4">Product</th>
                <th className="p-4">Color</th>
                <th className="p-4">Size</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Price</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                        {item.product.image ? (
                          <Image src={item.product.image} alt={item.product.title} fill className="object-cover" />
                        ) : null}
                      </div>
                      <span className="font-medium text-gray-800 line-clamp-2">{item.product.title}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400"></span>
                      {item.product.color || "Default"}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{item.product.size || "Large"}</td>
                  <td className="p-4">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(newQty) => updateQuantity(item.id, newQty)}
                      min={1}
                      max={99}
                    />
                  </td>
                  <td className="p-4 font-medium text-gray-800">{formatCurrency(item.product.price)}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => setItemToDelete(item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-end">
        <div className="w-full max-w-sm space-y-3 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Sub Total:</span>
            <span className="font-bold text-gray-800">{formatCurrency(subTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span className="font-bold text-gray-800">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-200 text-base">
            <span>Total:</span>
            <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
          </div>
          <div className="pt-4">
            <Button className="w-full" size="lg" onClick={() => setIsAddressModalOpen(true)}>
              Place Order
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={deleteItem}
        title="Remove Product"
        message="Are You Sure You Want To Delete The Item!"
        confirmText="Yes"
        cancelText="No"
        variant="danger"
      />

      <Modal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} title="Delivery Address">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Please provide your delivery address to place the order.</p>
          <Input
            id="address"
            name="address"
            label="Address"
            placeholder="123 Main St, City, Country"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsAddressModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlaceOrder} loading={submitting}>
              Confirm Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
