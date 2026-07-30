import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "warning" | "info" | "danger"
}

export function Badge({ className, variant = "info", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          "bg-[#43A047]/10 text-[#43A047]": variant === "success",
          "bg-[#FFB300]/10 text-[#FFB300]": variant === "warning",
          "bg-[#2979FF]/10 text-[#2979FF]": variant === "info",
          "bg-[#E53935]/10 text-[#E53935]": variant === "danger",
        },
        className
      )}
      {...props}
    />
  )
}
