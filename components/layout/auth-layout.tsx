import * as React from "react"
import Link from "next/link"

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F7FA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <Link href="/" className="text-3xl font-bold tracking-tight text-[#2979FF]">
            Almaar
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
