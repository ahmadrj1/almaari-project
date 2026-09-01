import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      <Navbar />
      <main className="container mx-auto flex-1 px-3 sm:px-4 py-6 sm:py-8 w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}
