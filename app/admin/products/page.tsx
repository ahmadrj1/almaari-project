import AdminProductsClient from "./admin-products-client";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">Loading products...</div>
      }
    >
      <AdminProductsClient />
    </Suspense>
  );
}
