"use client";

import { use } from "react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default function PaymentSuccessPage(props: PageProps) {
  const searchParams = use(props.searchParams);
  const orderId = searchParams.orderId;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#F5F7FA] p-4 overflow-hidden">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. Your payment was confirmed and your order
          is now processing.
        </p>

        {orderId && (
          <div className="bg-gray-50 p-4 rounded-xl mb-8 border border-gray-100 text-left">
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
            View Order Status
          </Link>
          <Link
            href="/cart"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 rounded-xl transition duration-150"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
