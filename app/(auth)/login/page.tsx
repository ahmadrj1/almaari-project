"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginSchema, LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string[]>>>({});
  const [globalError, setGlobalError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name as keyof LoginInput]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    }
    setGlobalError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setGlobalError("");

    const validation = loginSchema.safeParse(formData);
    
    if (!validation.success) {
      setErrors(validation.error.flatten().fieldErrors);
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: validation.data.email,
        password: validation.data.password,
      });

      if (result?.error) {
        setGlobalError("Invalid email or password");
      } else if (result?.ok) {
        router.push("/");
      }
    } catch (err) {
      setGlobalError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#2979FF]">Login</h1>
      </div>
      
      {globalError && (
        <div className="rounded border border-[#E53935] bg-red-50 p-3 text-sm text-[#E53935]">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password?.[0]}
          placeholder="••••••••"
          disabled={isLoading}
        />
        
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center space-x-2 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-[#2979FF] focus:ring-[#2979FF]"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
            />
            <span>Remember me</span>
          </label>
          <Link href="/forgot-password" className="font-medium text-[#2979FF] hover:underline">
            Forgot Password! Reset
          </Link>
        </div>

        <Button type="submit" fullWidth loading={isLoading}>
          Login
        </Button>
      </form>
      
      <div className="text-center text-sm">
        <Link href="/register" className="text-gray-600 hover:text-[#2979FF]">
          I don&apos;t have an account! <span className="font-medium text-[#2979FF]">SignUp</span>
        </Link>
      </div>
    </div>
  );
}
