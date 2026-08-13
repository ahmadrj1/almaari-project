import CartPage from "./cart-client";
import { Metadata } from "next";
import { APP_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Shopping Cart | ${APP_NAME}`,
  description:
    "View and manage the products in your shopping cart before checkout.",
};

export default function Page() {
  return <CartPage />;
}
