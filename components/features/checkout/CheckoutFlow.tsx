"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CreditCard, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinary";
import type { CartItemWithProduct, SavedAddress } from "@/types";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe-client";
import StripeCardForm from "@/components/features/payment/StripeCardForm";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface CheckoutFlowProps {
  items: CartItemWithProduct[];
  selectedItemIds: Set<string>;
  subTotal: number;
  tax: number;
  total: number;
  onBack: () => void;
  onSuccess: (orderId: string) => void;
  onCartRefresh: () => void;
  retryOrderId?: string;
  initialAddressId?: string;
}

export default function CheckoutFlow({
  items,
  selectedItemIds,
  subTotal,
  tax,
  total,
  onBack,
  onSuccess,
  onCartRefresh,
  retryOrderId,
  initialAddressId,
}: CheckoutFlowProps) {
  const [step, setStep] = useState<1 | 2>(retryOrderId ? 2 : 1);
  const [loading, setLoading] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    initialAddressId || "",
  );
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: "",
    city: "",
    zipCode: "",
    country: "",
  });

  // Payment
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<
    string | null
  >(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | "COD">(
    "COD",
  );
  const [showAddNewCard, setShowAddNewCard] = useState(false);

  const { showToast } = useToast();
  const router = useRouter();

  const selectedCartItems = items.filter((i) => selectedItemIds.has(i.id));

  const fetchAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      if (data.success) {
        const addrs: SavedAddress[] = data.data;
        setAddresses(addrs);
        if (addrs.length > 0) {
          if (
            initialAddressId &&
            addrs.some((a) => a.id === initialAddressId)
          ) {
            setSelectedAddressId(initialAddressId);
          } else {
            const def = addrs.find((a) => a.isDefault) ?? addrs[0];
            setSelectedAddressId(def.id);
          }
        } else {
          setIsAddingNew(true);
        }
      }
    } catch {
      showToast("error", "Failed to load addresses");
    } finally {
      setAddressesLoading(false);
    }
  }, [initialAddressId, showToast]);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/payment-methods");
      if (res.ok) {
        const data = await res.json();
        const pms: PaymentMethod[] = data.paymentMethods || [];
        const defId: string | null = data.defaultPaymentMethodId ?? null;
        pms.sort((a, b) => {
          if (a.id === defId) return -1;
          if (b.id === defId) return 1;
          return 0;
        });
        setPaymentMethods(pms);
        setDefaultPaymentMethodId(defId);
        if (defId) setSelectedPaymentId(defId);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setAddressesLoading(true);
      try {
        const [addrsRes, pmsRes] = await Promise.all([
          fetch("/api/addresses"),
          fetch("/api/stripe/payment-methods"),
        ]);
        if (!ignore && addrsRes.ok) {
          const data = await addrsRes.json();
          if (data.success) {
            const addrs: SavedAddress[] = data.data;
            setAddresses(addrs);
            if (addrs.length > 0) {
              if (
                initialAddressId &&
                addrs.some((a) => a.id === initialAddressId)
              ) {
                setSelectedAddressId(initialAddressId);
              } else {
                const def = addrs.find((a) => a.isDefault) ?? addrs[0];
                setSelectedAddressId(def.id);
              }
            } else {
              setIsAddingNew(true);
            }
          }
        }
        if (!ignore && pmsRes.ok) {
          const data = await pmsRes.json();
          const pms: PaymentMethod[] = data.paymentMethods || [];
          const defId: string | null = data.defaultPaymentMethodId ?? null;
          pms.sort((a, b) => {
            if (a.id === defId) return -1;
            if (b.id === defId) return 1;
            return 0;
          });
          setPaymentMethods(pms);
          setDefaultPaymentMethodId(defId);
          if (defId) setSelectedPaymentId(defId);
        }
      } catch {
        if (!ignore) showToast("error", "Failed to load delivery information");
      } finally {
        if (!ignore) setAddressesLoading(false);
      }
    }
    void loadData();
    return () => {
      ignore = true;
    };
  }, [initialAddressId, showToast]);

  const handleContinueToPayment = async () => {
    if (isAddingNew) {
      if (!newAddress.street) {
        showToast("error", "Street address is required");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newAddress,
            isDefault: addresses.length === 0,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSelectedAddressId(data.data.id);
          setIsAddingNew(false);
          await fetchAddresses();
          setStep(2);
        } else {
          showToast("error", data.error || "Failed to add address");
        }
      } catch {
        showToast("error", "Failed to add address");
      } finally {
        setLoading(false);
      }
    } else {
      if (!selectedAddressId) {
        showToast("error", "Please select an address");
        return;
      }
      setStep(2);
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const paymentMethod =
        selectedPaymentId === "COD" ? "CASH_ON_DELIVERY" : "CREDIT_DEBIT_CARD";
      const paymentMethodId =
        selectedPaymentId !== "COD" ? selectedPaymentId : undefined;

      const endpoint = retryOrderId
        ? `/api/orders/${retryOrderId}/retry-payment`
        : "/api/orders";
      const payload = retryOrderId
        ? { addressId: selectedAddressId, paymentMethod, paymentMethodId }
        : {
            addressId: selectedAddressId,
            selectedItemIds: Array.from(selectedItemIds),
            paymentMethod,
            paymentMethodId,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        onCartRefresh();
        if (paymentMethod === "CREDIT_DEBIT_CARD") {
          const {
            clientSecret,
            requiresRedirect,
            order,
            declined,
            declineError,
          } = data.data;
          if (declined) {
            router.push(
              `/payment/failed?orderId=${order.id}&error=${encodeURIComponent(declineError || "Payment declined.")}`,
            );
            return;
          }
          if (requiresRedirect || !paymentMethodId) {
            window.location.href = `/payment/success?orderId=${order.id}`;
            return;
          }
          const stripe = await stripePromise;
          if (stripe && clientSecret) {
            const { error } = await stripe.confirmCardPayment(clientSecret);
            if (error) {
              router.push(
                `/payment/failed?orderId=${order.id}&error=${encodeURIComponent(error.message || "Payment declined.")}`,
              );
              return;
            }
          }
          router.push(`/payment/success?orderId=${order.id}`);
        } else {
          onSuccess(data.data.order.id);
        }
      } else {
        showToast("error", data.error || "Failed to place order");
      }
    } catch {
      showToast("error", "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCardSuccess = async (pmId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethodId: pmId,
          setAsDefault: paymentMethods.length === 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchPaymentMethods();
        setSelectedPaymentId(data.paymentMethod?.id || pmId);
        setShowAddNewCard(false);
      } else {
        showToast("error", data.error || "Failed to save card");
      }
    } catch {
      showToast("error", "Error saving card");
    } finally {
      setLoading(false);
    }
  };

  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);

  const orderSummaryContent = (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
      <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider text-gray-400">
        Order Summary
      </h3>
      <div className="bg-blue-600 rounded-xl p-5 text-white mb-6">
        <div className="text-blue-100 text-xs font-medium mb-1">
          TOTAL TO PAY
        </div>
        <div className="text-3xl font-bold mb-1">{formatCurrency(total)}</div>
        <div className="text-blue-200 text-xs">
          {selectedCartItems.length} item
          {selectedCartItems.length !== 1 ? "s" : ""} · incl.{" "}
          {formatCurrency(tax)} tax
        </div>
      </div>

      <div className="space-y-4 mb-6 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
        {selectedCartItems.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="relative w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
              {item.product.image && (
                <Image
                  src={getOptimizedCloudinaryUrl(item.product.image, 100)}
                  alt={item.product.title}
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold z-10">
                {item.quantity}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="font-semibold text-gray-900 text-sm truncate pr-2">
                  {item.product.title}
                </p>
                <span className="font-bold text-gray-900 text-sm">
                  {formatCurrency(Number(item.product.price) * item.quantity)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.variant.color.hexCode }}
                />
                <span>
                  {item.variant.color.name} · {item.variant.size.name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-4 border-t border-gray-100 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>{formatCurrency(subTotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Tax</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
          <span>Total</span>
          <span className="text-blue-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#2979FF]">Checkout</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Complete your order securely
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 1 ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-400"}`}
            >
              {step > 1 ? <Check className="w-5 h-5" /> : "1"}
            </div>
            <span
              className={`text-xs font-semibold mt-1 ${step >= 1 ? "text-blue-600" : "text-gray-400"}`}
            >
              Delivery
            </span>
          </div>
          <div
            className={`w-12 h-0.5 rounded-full mb-4 ${step > 1 ? "bg-blue-600" : "bg-gray-200"}`}
          />
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 2 ? "bg-blue-600 text-white shadow-sm" : "bg-white border-2 border-gray-200 text-gray-400"}`}
            >
              {step >= 2 ? <CreditCard className="w-5 h-5" /> : "2"}
            </div>
            <span
              className={`text-xs font-semibold mt-1 ${step >= 2 ? "text-blue-600" : "text-gray-400"}`}
            >
              Payment
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main content */}
        <div className="lg:col-span-7 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto custom-scrollbar lg:pr-2">
          {/* STEP 1: Delivery */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Delivery Address
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Where should we send your order?
              </p>

              {addressesLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  {addresses.length > 0 && !isAddingNew && (
                    <div className="space-y-3 mb-6">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Saved Addresses
                      </p>
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${selectedAddressId === addr.id ? "border-blue-600 bg-blue-50/40" : "border-gray-200 hover:border-blue-300 bg-white"}`}
                        >
                          <div
                            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedAddressId === addr.id ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}
                          >
                            {selectedAddressId === addr.id && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 text-sm">
                                {addr.street}
                              </p>
                              {addr.isDefault && (
                                <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {[addr.city, addr.zipCode, addr.country]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setIsAddingNew(true)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-1"
                      >
                        + Add New Address
                      </button>
                    </div>
                  )}

                  {(isAddingNew || addresses.length === 0) && (
                    <div className="space-y-4 mb-6">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        New Address
                      </p>
                      <Input
                        label="Street Address *"
                        placeholder="123 Main St"
                        value={newAddress.street}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            street: e.target.value,
                          })
                        }
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="City"
                          placeholder="New York"
                          value={newAddress.city}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              city: e.target.value,
                            })
                          }
                        />
                        <Input
                          label="Postal Code"
                          placeholder="10001"
                          value={newAddress.zipCode}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              zipCode: e.target.value,
                            })
                          }
                        />
                      </div>
                      <Input
                        label="Country"
                        placeholder="United States"
                        value={newAddress.country}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            country: e.target.value,
                          })
                        }
                      />
                      {addresses.length > 0 && (
                        <button
                          onClick={() => setIsAddingNew(false)}
                          className="text-sm font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          ✕ Cancel
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-gray-100 pt-6 flex flex-col items-stretch gap-3">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleContinueToPayment}
                  loading={loading}
                >
                  Continue to Payment
                </Button>
                <button
                  onClick={onBack}
                  className="text-sm text-gray-500 font-medium hover:text-gray-800 transition flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Cart
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Payment */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Delivery summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                      Deliver To
                    </p>
                    {selectedAddr && (
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">
                          {selectedAddr.street}
                        </span>
                        {(selectedAddr.city ||
                          selectedAddr.zipCode ||
                          selectedAddr.country) && (
                          <span className="text-gray-500">
                            {" "}
                            ·{" "}
                            {[
                              selectedAddr.city,
                              selectedAddr.zipCode,
                              selectedAddr.country,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
              </div>

              {/* Payment card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Payment Method
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Choose how you&apos;d like to pay
                </p>

                <div className="space-y-3 mb-6">
                  {/* COD */}
                  <div
                    onClick={() => {
                      setSelectedPaymentId("COD");
                      setShowAddNewCard(false);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${selectedPaymentId === "COD" ? "border-blue-600 bg-blue-50/40" : "border-gray-200 hover:border-blue-300"}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedPaymentId === "COD" ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}
                    >
                      {selectedPaymentId === "COD" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                      💵
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        Cash on Delivery
                      </p>
                      <p className="text-gray-500 text-xs">
                        Pay when your order arrives
                      </p>
                    </div>
                  </div>

                  {/* Saved cards */}
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      onClick={() => {
                        setSelectedPaymentId(pm.id);
                        setShowAddNewCard(false);
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${selectedPaymentId === pm.id ? "border-blue-600 bg-blue-50/40" : "border-gray-200 hover:border-blue-300"}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedPaymentId === pm.id ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}
                      >
                        {selectedPaymentId === pm.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="w-9 h-9 bg-indigo-900 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm capitalize">
                          {pm.brand} •••• {pm.last4}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Expires {pm.expMonth}/
                          {pm.expYear.toString().slice(-2)}
                        </p>
                      </div>
                      {pm.id === defaultPaymentMethodId && (
                        <span className="text-blue-600 text-[10px] font-bold bg-blue-50 px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Add new card */}
                  {!showAddNewCard && (
                    <button
                      onClick={() => {
                        setShowAddNewCard(true);
                        setSelectedPaymentId("new");
                      }}
                      className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 text-sm font-semibold hover:text-blue-600 hover:border-blue-400 transition flex items-center gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-base">
                        +
                      </div>
                      Add new card
                    </button>
                  )}

                  {showAddNewCard && (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                      <Elements stripe={stripePromise}>
                        <StripeCardForm
                          onSuccess={handleAddCardSuccess}
                          onCancel={() => {
                            setShowAddNewCard(false);
                            setSelectedPaymentId(
                              paymentMethods.length > 0
                                ? paymentMethods[0].id
                                : "COD",
                            );
                          }}
                        />
                      </Elements>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-6 flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handlePlaceOrder}
                    loading={loading}
                    disabled={showAddNewCard || selectedPaymentId === "new"}
                  >
                    {selectedPaymentId === "COD"
                      ? "Place Order (Cash on Delivery)"
                      : `Pay ${formatCurrency(total)} Securely`}
                  </Button>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-gray-500 font-medium hover:text-gray-800 transition flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Delivery Info
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary sidebar */}
        <div className="lg:col-span-5">{orderSummaryContent}</div>
      </div>

      {/* Processing overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <Spinner size="lg" />
            <p className="text-gray-700 font-medium">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}
