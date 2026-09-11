import AddressesClient from "./addresses-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Saved Addresses | ${APP_NAME}`,
  description: `Manage your shipping addresses for fast and easy checkout on ${APP_NAME}.`,
};

export default function Page() {
  return <AddressesClient />;
}
