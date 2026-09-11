import AdminOrdersClient from "./admin-orders-client";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">Loading orders...</div>
      }
    >
      <AdminOrdersClient />
    </Suspense>
  );
}
