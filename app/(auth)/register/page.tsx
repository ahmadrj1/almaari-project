"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerSchema, RegisterInput } from "@/lib/validations/auth";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<RegisterInput>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string[]>>>({});
  const [globalError, setGlobalError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear field error when typing
    if (errors[e.target.name as keyof RegisterInput]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    }
    setGlobalError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setGlobalError("");

    const validation = registerSchema.safeParse(formData);
    
    if (!validation.success) {
      setErrors(validation.error.flatten().fieldErrors);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error || "Failed to register");
      } else {
        showToast("success", "Registration successful. Please login.");
        router.push("/login");
      }
    } catch (err) {
      setGlobalError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#2979FF]">SignUp</h1>
      </div>
      
      {globalError && (
        <div className="rounded border border-[#E53935] bg-red-50 p-3 text-sm text-[#E53935]">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          error={errors.fullName?.[0]}
          placeholder="John Doe"
          disabled={isLoading}
        />
        
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email?.[0]}
          placeholder="john@example.com"
          disabled={isLoading}
        />
        
        <Input
          label="Mobile"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          error={errors.phone?.[0]}
          placeholder="+1234567890"
          disabled={isLoading}
        />
        
        <Input
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password?.[0]}
          placeholder="••••••••"
          disabled={isLoading}
          showPasswordToggle
        />
        
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword?.[0]}
          placeholder="••••••••"
          disabled={isLoading}
          showPasswordToggle
        />

        <Button type="submit" fullWidth loading={isLoading}>
          SignUp
        </Button>
      </form>
      
      <div className="text-center text-sm">
        <span className="text-gray-600">Already have an account!
          <Link href="/login" className="font-medium whitespace-pre text-[#2979FF] hover:text-[#2979FF]"> Login</Link>
        </span>
      </div>
    </div>
  );
}
