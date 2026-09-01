import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { Role } from "@prisma/client";
import { LogOut, ChevronDown } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getServerSessionSnapshot } from "@/lib/auth-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSessionSnapshot();
  const user = session?.user;

  if (user?.role !== Role.ADMIN) {
    redirect("/");
  }

  const name = user?.name || "Admin";
  const email = user?.email || "";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6">
          <div className="relative group">
            <button className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-lg transition-colors">
              {/* Initials/Image avatar */}
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initials
                )}
              </div>
              <span className="text-sm font-medium text-blue-600">{name}</span>
              <ChevronDown size={16} className="text-gray-500" />
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {/* User info header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt={name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{email}</p>
                  </div>
                </div>
              </div>
              {/* Logout */}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-xl transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
