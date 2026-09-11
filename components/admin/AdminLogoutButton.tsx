"use client";

import { useFormStatus } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";

export function AdminLogoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-xl transition-colors disabled:opacity-50"
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin text-red-600" />
      ) : (
        <LogOut size={16} />
      )}
      Logout
    </button>
  );
}
