"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { UserMenu } from "./user-menu";
import { useSession } from "next-auth/react";
import { useCartCount } from "@/hooks/use-cart-count";
import { APP_NAME } from "@/lib/constants";
import { NotificationBell } from "./notification-bell";

export function Navbar() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { count: cartCount } = useCartCount();

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-[#2979FF]"
          >
            {APP_NAME}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated && <NotificationBell />}
          <Link
            href="/cart"
            className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#E53935] text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-200"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
