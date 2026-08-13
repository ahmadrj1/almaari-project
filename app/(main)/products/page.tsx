import ProductsPage from "./products-client";
import { Metadata } from "next";
import { APP_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Products | ${APP_NAME}`,
  description: `Browse our wide range of products at ${APP_NAME}.`,
};

export default function Page() {
  return <ProductsPage />;
}
