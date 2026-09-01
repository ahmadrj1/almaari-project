"use client";

import React, { useState } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

interface StripeCardFormProps {
  onSuccess: (paymentMethodId: string) => void;
  onCancel: () => void;
}

const STRIPE_ELEMENT_STYLE = {
  base: {
    fontSize: "15px",
    color: "#111827",
    fontFamily: "Inter, sans-serif",
    "::placeholder": { color: "#9ca3af" },
  },
  invalid: { color: "#dc2626" },
};

const FIELD_CLASS =
  "w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all";

export default function StripeCardForm({
  onSuccess,
  onCancel,
}: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setLoading(false);
      return;
    }

    const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
      type: "card",
      card: cardNumber,
      billing_details: cardholderName.trim()
        ? { name: cardholderName.trim() }
        : {},
    });

    if (pmError) {
      setError(pmError.message || "Failed to save card.");
      setLoading(false);
      return;
    }

    if (paymentMethod?.id) {
      onSuccess(paymentMethod.id);
    } else {
      setError("Failed to save card. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Cardholder Name
        </label>
        <input
          type="text"
          placeholder="Name on card"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Card Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Card Number
        </label>
        <div className={FIELD_CLASS}>
          <CardNumberElement
            options={{ style: STRIPE_ELEMENT_STYLE, showIcon: true }}
          />
        </div>
      </div>

      {/* Expiry + CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Expiry Date
          </label>
          <div className={FIELD_CLASS}>
            <CardExpiryElement options={{ style: STRIPE_ELEMENT_STYLE }} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            CVC
          </label>
          <div className={FIELD_CLASS}>
            <CardCvcElement options={{ style: STRIPE_ELEMENT_STYLE }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 transition text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 transition flex items-center gap-2 shadow-sm text-sm"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
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
              Saving...
            </>
          ) : (
            "Save Card"
          )}
        </button>
      </div>
    </form>
  );
}
