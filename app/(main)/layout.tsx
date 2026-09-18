import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getServerSessionSnapshot } from "@/lib/auth-session";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSessionSnapshot();
  if (session?.user?.role === Role.ADMIN) {
    redirect("/admin/products");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      <Navbar />
      <main className="container mx-auto flex-1 px-3 sm:px-4 py-6 sm:py-8 w-full flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
