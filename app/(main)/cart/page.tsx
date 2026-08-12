import CartPage from "./cart-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Cart | Almaari",
  description:
    "View and manage the products in your shopping cart before checkout.",
};

export default function Page() {
  return <CartPage />;
}
