import OrderDetailsPage from "./order-details-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Order #${id.slice(0, 8).toUpperCase()} | ${APP_NAME}`,
    description: `View details for order #${id} on ${APP_NAME}.`,
  };
}

export default function Page() {
  return <OrderDetailsPage />;
}
