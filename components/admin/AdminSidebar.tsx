"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, ClipboardList } from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/products", label: "Products", icon: Box },
    { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="font-bold text-xl text-gray-800">Almaari</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
