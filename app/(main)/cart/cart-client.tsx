"use client";

import { useState, useEffect, useCallback } from "react";
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
import type { CartItemWithProduct, SavedAddress } from "@/types";
import { useCartCount } from "@/hooks/use-cart-count";
import { TAX_PERCENTAGE, CART_ITEM_EXPIRY_MS } from "@/lib/constants";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinary";

const getTimestamp = () => Date.now();

export default function CartPage() {
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleteSelectedOpen, setIsDeleteSelectedOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAddress, setNewAddress] = useState({ street: "", city: "", country: "", zipCode: "" });
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const { decrement, refresh } = useCartCount();
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setSelectedItems(new Set(data.data.map((i: CartItemWithProduct) => i.id)));
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCart();
  }, [fetchCart]);

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
          setSelectedItems(prev => {
            const next = new Set(prev);
            next.delete(cartItemId);
            return next;
          });
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
        setSelectedItems(prev => {
          const next = new Set(prev);
          next.delete(itemToDelete);
          return next;
        });
        decrement();
        showToast("success", "Item removed from cart");
      }
    } catch {
      showToast("error", "Failed to remove item");
    } finally {
      setItemToDelete(null);
    }
  };

  const deleteSelectedItems = async () => {
    if (selectedItems.size === 0) return;
    try {
      setSubmitting(true);
      await Promise.all(
        Array.from(selectedItems).map((cartItemId) =>
          fetch("/api/cart", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cartItemId }),
          })
        )
      );
      setItems(items.filter((i) => !selectedItems.has(i.id)));
      setSelectedItems(new Set());
      refresh();
      showToast("success", "Selected items removed from cart");
    } catch {
      showToast("error", "Failed to remove items");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      if (data.success) {
        setAddresses(data.data);
        if (data.data.length > 0) setSelectedAddressId(data.data[0].id);
        else setIsAddingNew(true);
      }
    } catch {
      showToast("error", "Failed to fetch addresses");
    } finally {
      setLoadingAddresses(false);
    }
  };

  const openAddressModal = () => {
    setIsAddressModalOpen(true);
    fetchAddresses();
  };

  const handlePlaceOrder = async () => {
    let finalAddressId = selectedAddressId;

    if (isAddingNew) {
      if (!newAddress.street.trim()) {
        showToast("error", "Please enter street address");
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAddress),
        });
        const data = await res.json();
        if (data.success) {
          finalAddressId = data.data.id;
        } else {
          showToast("error", data.error || "Failed to add address");
          setSubmitting(false);
          return;
        }
      } catch {
        showToast("error", "Failed to add address");
        setSubmitting(false);
        return;
      }
    } else if (!finalAddressId) {
      showToast("error", "Please select an address");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          addressId: finalAddressId,
          selectedItemIds: Array.from(selectedItems) 
        }),
      });
      const data = await res.json();
      if (data.success) {
        refresh();
        setIsAddressModalOpen(false);
        setSubmitting(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setSubmitting(false);
        setSuccessOrderId(data.data.id);
      } else {
        showToast("error", data.error || "Failed to place order");
      }
    } catch {
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
          <Link href="/" className="hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          Your Shopping Bag
        </h1>
        <EmptyState
          icon={<AlertTriangle className="w-12 h-12 text-gray-400" />}
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet."
          action={
            <Button onClick={() => router.push("/")}>Browse Products</Button>
          }
        />
      </div>
    );
  }

  const subTotal = items
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const tax = subTotal * TAX_PERCENTAGE;
  const total = subTotal + tax;

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between items-center gap-2 mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-blue-600 flex items-center gap-2">
          <Link href="/" className="hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          Your Shopping Bag
        </h1>
        <Button
          variant="outline"
          size="sm"
          disabled={selectedItems.size === 0}
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 px-3 text-xs sm:text-sm whitespace-nowrap"
          onClick={() => setIsDeleteSelectedOpen(true)}
        >
          Delete Items ({selectedItems.size})
        </Button>
      </div>

      {items.length > 0 && (() => {
        const earliestItem = [...items].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())[0];
        if (!earliestItem) return null;
        
        const expiryTime = new Date(earliestItem.updatedAt).getTime() + CART_ITEM_EXPIRY_MS;
        const timeLeft = Math.max(0, expiryTime - getTimestamp());
        
        if (timeLeft <= 0) return null;

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        return (
          <p className="text-sm text-gray-500 mb-4">
            Items in your cart are reserved. The earliest item will expire in{" "}
            <span className="font-medium text-gray-700">
              {hours}h {minutes}m {seconds}s
            </span>
          </p>
        );
      })()}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-auto max-h-[460px] custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 shadow-sm">
                <th className="p-4 w-12 text-center bg-gray-50">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedItems.size === items.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(new Set(items.map(i => i.id)));
                      } else {
                        setSelectedItems(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Product</th>
                <th className="p-4">Color</th>
                <th className="p-4">Size</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Rate</th>
                <th className="p-4">Total Price</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => {
                const rate = Number(item.product.price);
                const lineTotal = rate * item.quantity;
                return (
                  <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${!selectedItems.has(item.id) ? 'opacity-50' : ''}`}>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => {
                          setSelectedItems(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(item.id);
                            else next.delete(item.id);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                          {item.product.image ? (
                            <Image src={getOptimizedCloudinaryUrl(item.product.image, 160)} alt={item.product.title} fill sizes="64px" className="object-cover" />
                          ) : null}
                        </div>
                        <span className="font-medium text-gray-800 line-clamp-2">{item.product.title}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-4 h-4 rounded-full border border-gray-200" 
                          style={{ backgroundColor: item.variant.color.hexCode }} 
                        />
                        <span className="text-sm text-gray-700">{item.variant.color.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md">
                        {item.variant.size.name}
                      </span>
                    </td>
                    <td className="p-4">
                      <QuantitySelector
                        value={item.quantity}
                        onChange={(newQty) => updateQuantity(item.id, newQty)}
                        min={1}
                        max={item.variant.stock ?? 99}
                      />
                    </td>
                    <td className="p-4 font-medium text-gray-600">{formatCurrency(rate)}</td>
                    <td className="p-4 font-bold text-gray-900">{formatCurrency(lineTotal)}</td>
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
                );
              })}
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
            <Button 
              className="w-full" 
              size="lg" 
              onClick={openAddressModal}
              disabled={selectedItems.size === 0}
            >
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

      <ConfirmDialog
        isOpen={isDeleteSelectedOpen}
        onClose={() => setIsDeleteSelectedOpen(false)}
        onConfirm={() => {
          setIsDeleteSelectedOpen(false);
          deleteSelectedItems();
        }}
        title="Delete Selected Items"
        message="Are you sure you want to delete the selected items?"
        confirmText="Yes"
        cancelText="No"
        variant="danger"
      />

      <Modal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} title="Delivery Address">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Please provide your delivery address to place the order.</p>
          
          {loadingAddresses ? (
            <div className="flex justify-center p-4"><Spinner size="sm" /></div>
          ) : (
            <div className="space-y-4">
              {!isAddingNew && addresses.length > 0 && (
                <div className="space-y-2">
                  {addresses.map(addr => (
                    <label key={addr.id} className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                      <input 
                        type="radio" 
                        name="addressId" 
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={(e) => setSelectedAddressId(e.target.value)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <p className="font-medium">{addr.street}</p>
                        <p className="text-gray-500">{[addr.city, addr.zipCode, addr.country].filter(Boolean).join(", ")}</p>
                      </div>
                    </label>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setIsAddingNew(true)}>
                    + Add New Address
                  </Button>
                </div>
              )}

              {isAddingNew && (
                <div className="space-y-3">
                  <Input
                    label="Street Address *"
                    placeholder="123 Main St"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="City"
                      placeholder="New York"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                    />
                    <Input
                      label="Zip Code"
                      placeholder="10001"
                      value={newAddress.zipCode}
                      onChange={(e) => setNewAddress({...newAddress, zipCode: e.target.value})}
                    />
                  </div>
                  <Input
                    label="Country"
                    placeholder="United States"
                    value={newAddress.country}
                    onChange={(e) => setNewAddress({...newAddress, country: e.target.value})}
                  />
                  {addresses.length > 0 && (
                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setIsAddingNew(false)}>
                      Cancel Adding New Address
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

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

      {/* Processing overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <Spinner size="lg" />
            <p className="text-gray-700 font-medium">Processing your order…</p>
          </div>
        </div>
      )}

      {/* Success dialog */}
      {successOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-6 shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Order Placed!</h2>
              <p className="text-sm text-gray-500">Your order has been successfully placed.</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <Button className="w-full" onClick={() => router.push(`/orders/${successOrderId}`)}>
                Check Order Details
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
