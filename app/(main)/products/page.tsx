import ProductsPage from "./products-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: `Products | ${APP_NAME}`,
  description: `Browse our wide range of products at ${APP_NAME}.`,
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">Loading products...</div>
      }
    >
      <ProductsPage />
    </Suspense>
  );
}
