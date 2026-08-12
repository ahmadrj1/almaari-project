import HomePage from "./client-page";
import { Metadata } from "next";
import { APP_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Home | ${APP_NAME}`,
  description: `Browse and buy products from our wide collection on ${APP_NAME}.`,
};

export default function Page() {
  return <HomePage />;
}
