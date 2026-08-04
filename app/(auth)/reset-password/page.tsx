"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  resetPasswordSchema,
  ResetPasswordInput,
} from "@/lib/validations/auth";

function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ResetPasswordInput, string[]>>
  >({});

  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = resetPasswordSchema.safeParse({
      password,
      confirmPassword,
    });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const data = await res.json();

      if (data.success) {
        showToast("success", data.message);
        router.push("/login");
      } else {
        if (data.details) {
          setErrors(data.details);
        } else {
          showToast("error", data.error || "An error occurred");
        }
      }
    } catch (error) {
      showToast("error", "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-1">
      <h1 className="text-2xl font-bold text-[#2979FF] mb-6 text-center">
        Reset Password
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="password"
          name="password"
          type="password"
          label="New password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password?.[0]}
          disabled={loading}
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword?.[0]}
          disabled={loading}
        />

        <div className="pt-2">
          <Button type="submit" fullWidth loading={loading}>
            Reset Password
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="flex justify-center p-8">Loading...</div>}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
