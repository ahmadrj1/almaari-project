import HomePage from "./client-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | Almaari",
  description: "Browse and buy products from our wide collection on Almaari.",
};

export default function Page() {
  return <HomePage />;
}
