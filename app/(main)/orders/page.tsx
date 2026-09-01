import OrdersPage from "./orders-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `My Orders | ${APP_NAME}`,
  description: `View and track your previous orders at ${APP_NAME}.`,
};

export default function Page() {
  return <OrdersPage />;
}
