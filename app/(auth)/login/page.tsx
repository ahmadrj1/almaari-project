import LoginPage from "./login-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Almaari",
  description: "Log in to your Almaari account to shop and manage your orders.",
};

export default function Page() {
  return <LoginPage />;
}
