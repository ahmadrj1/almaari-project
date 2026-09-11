import PaymentMethodsClient from "./payment-methods-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Payment Methods | ${APP_NAME}`,
  description: `Manage your saved credit and debit cards securely on ${APP_NAME}.`,
};

export default function Page() {
  return <PaymentMethodsClient />;
}
