import OrdersPage from "./orders-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Orders | Almaari",
  description: "View and track your previous orders at Almaari.",
};

export default function Page() {
  return <OrdersPage />;
}
