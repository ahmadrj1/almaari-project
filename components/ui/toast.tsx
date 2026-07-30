"use client"

import * as React from "react"
import { CheckCircle, XCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info"

export interface ToastProps {
  type: ToastType
  message: string
  onClose: () => void
}

export function Toast({ type, message, onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-center justify-between space-x-4 rounded-lg p-4 shadow-lg ring-1 ring-black/5 transition-all",
        {
          "bg-[#43A047] text-white": type === "success",
          "bg-[#E53935] text-white": type === "error",
          "bg-[#2979FF] text-white": type === "info",
        }
      )}
    >
      <div className="flex items-center space-x-3">
        {type === "success" && <CheckCircle className="h-5 w-5" />}
        {type === "error" && <XCircle className="h-5 w-5" />}
        {type === "info" && <Info className="h-5 w-5" />}
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button onClick={onClose} className="opacity-80 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
