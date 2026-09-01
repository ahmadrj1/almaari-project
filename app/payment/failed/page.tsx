"use client";

import { use } from "react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ orderId?: string; error?: string }>;
}

export default function PaymentFailedPage(props: PageProps) {
  const searchParams = use(props.searchParams);
  const orderId = searchParams.orderId;
  const errorMsg = searchParams.error
    ? decodeURIComponent(searchParams.error)
    : "Your payment could not be processed.";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#F5F7FA] p-4 overflow-hidden">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Declined
        </h1>

        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-left">
          <p className="text-red-700 font-medium text-sm">{errorMsg}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-left space-y-1">
          <p className="text-amber-800 font-semibold text-sm">
            🔄 Automatic Retries Enabled
          </p>
          <p className="text-amber-700 text-sm leading-relaxed">
            Stripe will automatically retry your payment{" "}
            <strong>2 more times</strong> with a gap of <strong>3 days</strong>{" "}
            between each attempt. Your order remains active and your items are
            reserved until all retries are exhausted.
          </p>
          <p className="text-amber-700 text-sm">
            You will be notified of the outcome of each retry attempt.
          </p>
        </div>

        {orderId && (
          <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100 text-left">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">
                Order Reference:
              </span>
              <span className="text-gray-900 font-mono font-bold select-all">
                {orderId}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href={orderId ? `/orders/${orderId}` : "/orders"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition duration-150 shadow-sm"
          >
            View Order Status and Retry Payment
          </Link>
          <Link
            href="/cart"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 rounded-xl transition duration-150"
          >
            Go to Cart Page
          </Link>
        </div>
      </div>
    </div>
  );
}
