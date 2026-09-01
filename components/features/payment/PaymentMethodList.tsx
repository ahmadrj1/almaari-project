"use client";

import React from "react";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface PaymentMethodListProps {
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId: string | null;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  loadingId: string | null;
}

export default function PaymentMethodList({
  paymentMethods,
  defaultPaymentMethodId,
  onSetDefault,
  onDelete,
  loadingId,
}: PaymentMethodListProps) {
  if (paymentMethods.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
        <span className="text-4xl">💳</span>
        <h3 className="mt-2 text-sm font-bold text-gray-900">No saved cards</h3>
        <p className="mt-1 text-sm text-gray-500">
          Save card details during checkout or add a card below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paymentMethods.map((pm) => {
        const isDefault = pm.id === defaultPaymentMethodId;
        const isLoading = pm.id === loadingId;

        return (
          <div
            key={pm.id}
            className={`flex items-center justify-between p-5 border rounded-2xl transition duration-150 ${
              isDefault
                ? "border-blue-500 bg-blue-50/30"
                : "border-gray-100 hover:border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 text-2xl shadow-sm">
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
                  onClick={() => onSetDefault(pm.id)}
                  disabled={isLoading || loadingId !== null}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3.5 py-2 rounded-xl transition disabled:opacity-50"
                >
                  Set as Default
                </button>
              )}
              <button
                onClick={() => onDelete(pm.id)}
                disabled={isLoading || loadingId !== null}
                className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition disabled:opacity-50"
                title="Remove Card"
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
  );
}
