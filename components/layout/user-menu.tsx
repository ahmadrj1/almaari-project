"use client"

import * as React from "react"
import Link from "next/link"
import { LogOut, Package } from "lucide-react"
import { useSession, signOut } from "next-auth/react"

export function UserMenu() {
  const [isOpen, setIsOpen] = React.useState(false)
  const { data: session } = useSession()
  const user = session?.user

  const getInitials = (name?: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2979FF] text-xs font-semibold text-white">
          {getInitials(user?.name)}
        </div>
        <span className="hidden max-w-[100px] truncate md:inline-block">
          {user?.name || "User"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
          <div className="border-b border-gray-50 px-4 py-2 text-xs">
            <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-gray-500 truncate">{user?.email}</p>
          </div>
          <Link
            href="/orders"
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            <Package className="mr-3 h-4 w-4 text-gray-400" />
            Orders
          </Link>
          <button
            className="flex w-full items-center px-4 py-2 text-left text-sm text-[#E53935] hover:bg-red-50"
            onClick={() => {
              setIsOpen(false)
              signOut({ callbackUrl: "/login" })
            }}
          >
            <LogOut className="mr-3 h-4 w-4 text-[#E53935]" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
