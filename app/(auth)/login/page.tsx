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
        rememberMe: String(rememberMe),
      });

      if (result?.error) {
        setGlobalError("Invalid email or password");
      } else if (result?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (sessionData?.user?.role === "ADMIN") {
          window.location.href = "/admin/products";
        } else {
          window.location.href = "/";
        }
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
          showPasswordToggle
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
        </div>

        <Button type="submit" fullWidth loading={isLoading}>
          Login
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        fullWidth
        disabled={isLoading}
        onClick={() => signIn("google", { callbackUrl: "/login" })}
      >
        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
          <path fill="#4285F4" d="M488 261.8c0-16.7-1.5-32.9-4.3-48.5H248v91.8h134.8c-5.8 31.3-23.4 57.8-50 75.6v62.8h81c47.4-43.6 74.2-107.8 74.2-181.7z"></path>
          <path fill="#34A853" d="M248 504c69.1 0 127.1-22.9 169.5-62.1l-81-62.8c-22.4 15-51.2 23.9-88.5 23.9-68.1 0-125.8-46-146.4-108H19.7v64.8C62 443.8 147.2 504 248 504z"></path>
          <path fill="#FBBC05" d="M101.6 295c-5.2-15.6-8.2-32.3-8.2-49.7s3-34.1 8.2-49.7V130.8H19.7C2.2 165.6-7.8 204.8-7.8 245.3s10 79.7 27.5 114.5l81.9-64.8z"></path>
          <path fill="#EA4335" d="M248 94.3c37.6 0 71.4 12.9 98 38.3l73.5-73.5C375.1 21.4 317.1 0 248 0 147.2 0 62 60.2 19.7 143.7l81.9 64.8C122.2 140.3 179.9 94.3 248 94.3z"></path>
        </svg>
        Sign in with Google
      </Button>
      <div className="text-center text-sm">
        <span className="text-gray-600">Forgot Password!
          <Link href="/forgot-password" className="font-medium text-[#2979FF] whitespace-pre hover:text-[#2979FF]"> Reset</Link>
        </span>
      </div>
      <div className="text-center text-sm">
        <span className="text-gray-600">I don&apos;t have an account!
          <Link href="/register" className="font-medium whitespace-pre text-[#2979FF] hover:text-[#2979FF]"> SignUp</Link>
        </span>
      </div>
    </div>
  );
}
