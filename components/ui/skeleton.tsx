import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circle" | "rect"
}

export function Skeleton({ className, variant = "rect", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200",
        {
          "h-4 w-full rounded": variant === "text",
          "rounded-full": variant === "circle",
          "rounded-md": variant === "rect",
        },
        className
      )}
      {...props}
    />
  )
}
