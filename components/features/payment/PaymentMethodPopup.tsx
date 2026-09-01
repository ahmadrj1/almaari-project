"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe-client";
import StripeCardForm from "./StripeCardForm";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface PaymentMethodPopupProps {
  onClose: () => void;
  onConfirm: (
    method: "CASH_ON_DELIVERY" | "CREDIT_DEBIT_CARD",
    paymentMethodId?: string,
  ) => void;
  subTotal: number;
  tax: number;
  total: number;
}

export default function PaymentMethodPopup({
  onClose,
  onConfirm,
  total,
}: PaymentMethodPopupProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | "COD">(
    "COD",
  );
  const [loading, setLoading] = useState(true);
  const [showAddNew, setShowAddNew] = useState(false);
  const [isDuplicateError, setIsDuplicateError] = useState<boolean>(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/payment-methods");
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(data.paymentMethods || []);
        if (data.defaultPaymentMethodId) {
          setSelectedMethodId(data.defaultPaymentMethodId);
        } else if (data.paymentMethods && data.paymentMethods.length > 0) {
          setSelectedMethodId(data.paymentMethods[0].id);
        } else {
          setSelectedMethodId("COD");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/stripe/payment-methods");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setPaymentMethods(data.paymentMethods || []);
            if (data.defaultPaymentMethodId) {
              setSelectedMethodId(data.defaultPaymentMethodId);
            } else if (data.paymentMethods && data.paymentMethods.length > 0) {
              setSelectedMethodId(data.paymentMethods[0].id);
            } else {
              setSelectedMethodId("COD");
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleAddNewCardClick = () => {
    setIsDuplicateError(false);
    setAddCardError(null);
    setShowAddNew(true);
  };

  const handleAddCardSuccess = async (paymentMethodId: string) => {
    try {
      setLoading(true);
      setIsDuplicateError(false);
      setAddCardError(null);
      const res = await fetch("/api/stripe/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId, setAsDefault: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "DUPLICATE_CARD") {
          setIsDuplicateError(true);
        } else {
          setAddCardError(
            data.error || "Failed to save card. Please try again.",
          );
        }
        setShowAddNew(false);
        return;
      }

      await fetchPaymentMethods();
      setSelectedMethodId(paymentMethodId);
      setShowAddNew(false);
    } catch (e) {
      console.error(e);
      setAddCardError("An unexpected error occurred. Please try again.");
      setShowAddNew(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedMethodId === "COD") {
      onConfirm("CASH_ON_DELIVERY");
    } else {
      onConfirm("CREDIT_DEBIT_CARD", selectedMethodId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            Choose Payment Method
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="text-sm font-medium text-gray-500">
                Loading payment options...
              </p>
            </div>
          ) : showAddNew ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800 text-base">
                  Add New Credit/Debit Card
                </h3>
              </div>
              <Elements stripe={stripePromise}>
                <StripeCardForm
                  onSuccess={handleAddCardSuccess}
                  onCancel={() => setShowAddNew(false)}
                />
              </Elements>
            </div>
          ) : (
            <div className="space-y-4">
              {isDuplicateError && (
                <div className="text-sm font-medium text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  This card is already saved to your account.
                </div>
              )}
              {addCardError && (
                <div className="text-sm font-medium text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                  {addCardError}
                </div>
              )}
              {/* Payment Methods List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {paymentMethods.map((pm) => (
                  <label
                    key={pm.id}
                    className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all duration-150 ${
                      selectedMethodId === pm.id
                        ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        value={pm.id}
                        checked={selectedMethodId === pm.id}
                        onChange={() => setSelectedMethodId(pm.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💳</span>
                        <div className="text-sm font-medium text-gray-800 capitalize">
                          {pm.brand} •••• {pm.last4}
                        </div>
                        <div className="text-xs text-gray-400">
                          Exp {pm.expMonth}/{pm.expYear.toString().slice(-2)}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}

                {/* Cash on Delivery option */}
                <label
                  className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all duration-150 ${
                    selectedMethodId === "COD"
                      ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="COD"
                      checked={selectedMethodId === "COD"}
                      onChange={() => setSelectedMethodId("COD")}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏠</span>
                      <div className="text-sm font-bold text-gray-800">
                        Cash on Delivery
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Add card button */}
              <button
                type="button"
                onClick={handleAddNewCardClick}
                className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-blue-500 text-gray-600 hover:text-blue-600 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <span>+</span> Add New Card
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showAddNew && (
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Total Amount
              </span>
              <div className="text-xl font-bold text-gray-900">
                PKR{" "}
                {total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition text-sm"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition disabled:opacity-50 text-sm flex items-center gap-2"
              >
                Confirm Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
