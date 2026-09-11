import BulkAddProductsView from "@/components/admin/BulkAddProductsView";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Bulk Add Products | ${APP_NAME}`,
  description: `Upload and add multiple products to store inventory on ${APP_NAME}.`,
};

export default function BulkAddProductsPage() {
  return <BulkAddProductsView />;
}
