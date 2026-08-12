import ProductsPage from "./products-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products | Almaari",
  description: "Browse our wide range of products at Almaari.",
};

export default function Page() {
  return <ProductsPage />;
}
