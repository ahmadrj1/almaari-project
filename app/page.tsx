import HomePage from "./client-page";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { Suspense } from "react";
import { getServerSessionSnapshot } from "@/lib/auth-session";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: `Home | ${APP_NAME}`,
  description: `Browse and buy products from our wide collection on ${APP_NAME}.`,
};

export default async function Page() {
  const session = await getServerSessionSnapshot();
  if (session?.user?.role === Role.ADMIN) {
    redirect("/admin/products");
  }

  return (
    <Suspense
      fallback={<div className="flex justify-center p-8">Loading...</div>}
    >
      <HomePage />
    </Suspense>
  );
}
