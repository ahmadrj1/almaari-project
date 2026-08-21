"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResetLinkExpiredPage() {
  return (
    <div className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto py-4">
      <div className="rounded-full bg-red-100 p-4 text-[#E53935]">
        <AlertCircle className="h-10 w-10" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Reset Link Expired</h1>
        <p className="text-sm text-gray-600">
          The password reset link you clicked is invalid or has expired.
          Password reset links are only valid for a limited time.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
        <Link href="/forgot-password" className="w-full">
          <Button fullWidth variant="primary">
            Retry
          </Button>
        </Link>
        <Link href="/" className="w-full">
          <Button fullWidth variant="outline">
            Back to Homepage
          </Button>
        </Link>
      </div>
    </div>
  );
}
