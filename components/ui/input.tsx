"use client";

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  showPasswordToggle?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, id, showPasswordToggle, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const [showPassword, setShowPassword] = React.useState(false)

    const isPasswordType = type === "password"
    const actualType = isPasswordType && showPasswordToggle ? (showPassword ? "text" : "password") : type

    return (
      <div className="flex flex-col space-y-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700">
            {label.endsWith(' *') ? (
              <>{label.slice(0, -2)} <span className="text-[#E53935]">*</span></>
            ) : label.endsWith('*') ? (
              <>{label.slice(0, -1)}<span className="text-[#E53935]">*</span></>
            ) : label}
          </label>
        )}
        <div className="relative w-full flex items-center">
          <input
            id={inputId}
            type={actualType}
            className={cn(
              "flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2979FF] disabled:cursor-not-allowed disabled:opacity-50",
              isPasswordType && showPasswordToggle && "pr-10",
              error && "border-[#E53935] focus:ring-[#E53935]",
              className
            )}
            ref={ref}
            {...props}
          />
          {isPasswordType && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 flex items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-[13px] text-[#E53935]">{error}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"
