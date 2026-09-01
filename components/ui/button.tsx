import * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={loading || disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[#2979FF] text-white hover:bg-blue-600": variant === "primary",
            "border border-gray-300 bg-transparent hover:bg-gray-100":
              variant === "outline",
            "bg-[#E53935] text-white hover:bg-red-600": variant === "danger",
            "bg-transparent hover:bg-gray-100": variant === "ghost",
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 py-2": size === "md",
            "h-12 px-8 text-lg": size === "lg",
            "w-full": fullWidth,
          },
          className,
        )}
        {...props}
      >
        {loading && <Spinner className="mr-2" size="sm" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
