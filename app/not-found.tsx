import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h2 className="text-4xl font-bold text-[#2979FF] mb-4">404</h2>
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          Page Not Found
        </h3>
        <p className="text-gray-600 mb-8 max-w-md">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
}
