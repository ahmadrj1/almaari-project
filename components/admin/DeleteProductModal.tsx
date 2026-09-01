"use client";

import { AlertTriangle } from "lucide-react";

interface DeleteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function DeleteProductModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteProductModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 text-center flex flex-col items-center">
        <h2 className="text-2xl font-semibold text-blue-500 mb-6">
          Remove Product
        </h2>

        <AlertTriangle
          className="text-yellow-400 w-24 h-24 mb-6"
          strokeWidth={1.5}
        />

        <p className="text-lg font-bold text-gray-800 mb-8 whitespace-pre-line">
          {"Are You Sure You Want To\nDelete The Item!"}
        </p>

        <div className="flex gap-4 w-full max-w-[280px]">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded border border-blue-500 text-blue-500 font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isDeleting ? "..." : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}
