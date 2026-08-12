import RegisterPage from "./register-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register | Almaari",
  description: "Create a new Almaari account and start shopping today.",
};

export default function Page() {
  return <RegisterPage />;
}
