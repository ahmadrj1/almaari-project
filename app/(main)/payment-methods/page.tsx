"use client";

import React, { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe-client";
import StripeCardForm from "@/components/features/payment/StripeCardForm";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";

const MAX_CARDS = 5;

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export default function ManagePaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [setDefaultPrompt, setSetDefaultPrompt] = useState<string | null>(null); // PM id pending default prompt
  const { showToast } = useToast();

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch("/api/stripe/payment-methods");
      if (res.ok) {
        const data = await res.json();
        const pms: PaymentMethod[] = data.paymentMethods || [];
        const defaultId: string | null = data.defaultPaymentMethodId;
        // Sort: default first
        pms.sort((a, b) => {
          if (a.id === defaultId) return -1;
          if (b.id === defaultId) return 1;
          return 0;
        });
        setPaymentMethods(pms);
        setDefaultPaymentMethodId(defaultId);
      } else {
        showToast("error", "Failed to retrieve payment methods");
      }
    } catch {
      showToast("error", "An error occurred loading payment methods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/stripe/payment-methods");
        if (res.ok) {
          const data = await res.json();
          const pms: PaymentMethod[] = data.paymentMethods || [];
          const defaultId: string | null = data.defaultPaymentMethodId;
          pms.sort((a, b) => {
            if (a.id === defaultId) return -1;
            if (b.id === defaultId) return 1;
            return 0;
          });
          if (!ignore) {
            setPaymentMethods(pms);
            setDefaultPaymentMethodId(defaultId);
          }
        } else {
          if (!ignore) showToast("error", "Failed to retrieve payment methods");
        }
      } catch {
        if (!ignore)
          showToast("error", "An error occurred loading payment methods");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [showToast]);

  const handleAddNewClick = () => {
    if (paymentMethods.length >= MAX_CARDS) {
      showToast(
        "info",
        `You can save up to ${MAX_CARDS} cards. Remove one to add another.`,
      );
      return;
    }
    setShowAddNew(true);
  };

  // Called by StripeCardForm after tokenization — prompt user about default before saving
  const handleCardTokenized = (paymentMethodId: string) => {
    if (paymentMethods.length === 0) {
      // First card — always set as default, no prompt
      saveCard(paymentMethodId, true);
    } else {
      setSetDefaultPrompt(paymentMethodId);
    }
  };

  const saveCard = async (paymentMethodId: string, setAsDefault: boolean) => {
    setSetDefaultPrompt(null);
    setShowAddNew(false);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId, setAsDefault }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "DUPLICATE_CARD") {
          showToast("info", "This card is already saved to your account.");
        } else {
          showToast("error", data.error || "Failed to save card details");
        }
        return;
      }
      showToast("success", "Card added successfully");
      await fetchPaymentMethods();
    } catch {
      showToast("error", "An error occurred saving card details");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/stripe/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setAsDefault: true }),
      });
      if (res.ok) {
        setDefaultPaymentMethodId(id);
        setPaymentMethods((prev) => {
          const sorted = [...prev].sort((a, b) => {
            if (a.id === id) return -1;
            if (b.id === id) return 1;
            return 0;
          });
          return sorted;
        });
        showToast("success", "Default payment method updated");
      } else {
        showToast("error", "Failed to set default card");
      }
    } catch {
      showToast("error", "An error occurred updating default card");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setLoadingId(id);
    try {
      const res = await fetch(`/api/stripe/payment-methods/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("success", "Card removed successfully");
        await fetchPaymentMethods();
      } else {
        showToast("error", "Failed to remove card");
      }
    } catch {
      showToast("error", "An error occurred removing card");
    } finally {
      setLoadingId(null);
    }
  };

  const sortedMethods = [...paymentMethods].sort((a, b) => {
    if (a.id === defaultPaymentMethodId) return -1;
    if (b.id === defaultPaymentMethodId) return 1;
    return 0;
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-[#2979FF]">
          Payment Methods
        </h1>
        <button
          onClick={handleAddNewClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition duration-150 shadow-sm text-sm"
        >
          + Add Card
        </button>
      </div>

      {paymentMethods.length >= MAX_CARDS && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          You have reached the maximum of {MAX_CARDS} saved cards. Remove one to
          add another.
        </div>
      )}

      {loading && paymentMethods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500 font-medium">
            Loading saved cards...
          </p>
        </div>
      ) : sortedMethods.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <span className="text-4xl">💳</span>
          <h3 className="mt-2 text-sm font-bold text-gray-900">
            No saved cards
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add a card to use during checkout.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100">
            {sortedMethods.map((pm) => {
              const isDefault = pm.id === defaultPaymentMethodId;
              const isLoading = pm.id === loadingId;
              return (
                <div
                  key={pm.id}
                  className={`flex items-center justify-between px-6 py-5 transition duration-150 ${isDefault ? "bg-blue-50/40" : "hover:bg-gray-50/50"}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 text-xl shadow-sm">
                      💳
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 capitalize">
                          {pm.brand}
                        </span>
                        <span className="text-gray-600 font-medium">
                          •••• {pm.last4}
                        </span>
                        {isDefault && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mt-0.5">
                        Expires {pm.expMonth}/{pm.expYear.toString().slice(-2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isDefault && paymentMethods.length > 1 && (
                      <button
                        onClick={() => handleSetDefault(pm.id)}
                        disabled={isLoading || loadingId !== null}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3.5 py-2 rounded-xl transition disabled:opacity-50"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(pm.id)}
                      disabled={isLoading || loadingId !== null || isDefault}
                      className={`p-2 rounded-xl transition ${isDefault ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"}`}
                      title={
                        isDefault ? "Cannot remove default card" : "Remove Card"
                      }
                    >
                      {isLoading ? (
                        <svg
                          className="animate-spin h-5 w-5 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Set as Default prompt modal */}
      {setDefaultPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Set as Default?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Would you like to set this card as your default payment method?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => saveCard(setDefaultPrompt, true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-sm"
              >
                Yes, Set as Default
              </button>
              <button
                onClick={() => saveCard(setDefaultPrompt, false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition text-sm"
              >
                No, Just Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      <Modal
        isOpen={showAddNew}
        onClose={() => setShowAddNew(false)}
        title="Add New Card"
      >
        <Elements stripe={stripePromise}>
          <StripeCardForm
            onSuccess={handleCardTokenized}
            onCancel={() => setShowAddNew(false)}
          />
        </Elements>
      </Modal>

      {/* Delete confirm modal — same UI as DeleteProductModal / Cart */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove Card"
        message={"Are You Sure You Want To\nRemove This Card!"}
        confirmText={loadingId !== null ? "..." : "Yes"}
        cancelText="No"
      />
    </div>
  );
}
