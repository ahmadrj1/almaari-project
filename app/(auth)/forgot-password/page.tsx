"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  forgotPasswordSchema,
  ForgotPasswordInput,
} from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ForgotPasswordInput, string[]>>
  >({});
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        showToast("success", data.message);
        setEmail("");
      } else {
        if (data.details) {
          setErrors(data.details);
        } else {
          showToast("error", data.error || "An error occurred");
        }
      }
    } catch (error) {
      showToast("error", "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-1">
      <h1 className="text-2xl font-bold text-[#2979FF] mb-6 text-center">
        Forgot Password
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email?.[0]}
          disabled={loading}
        />

        <div className="pt-2">
          <Button type="submit" fullWidth loading={loading}>
            Forgot Password
          </Button>
        </div>

        <div className="text-center text-sm">
          <span className="text-gray-600">
            No, I remember my password
            <Link
              href="/login"
              className="font-medium whitespace-pre text-[#2979FF] hover:text-[#2979FF]"
            >
              {" "}
              Login
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
}
