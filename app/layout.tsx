import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Modern E-commerce application",
};

import { ToastProvider } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast-container";
import { SessionProvider } from "next-auth/react";
import { CartCountProvider } from "@/hooks/use-cart-count";
import { AuthProvider } from "@/components/providers/auth-provider";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[#F5F7FA]">
        <SessionProvider>
          <AuthProvider>
            <ToastProvider>
              <CartCountProvider>
                {children}
                <ToastContainer />
              </CartCountProvider>
            </ToastProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
