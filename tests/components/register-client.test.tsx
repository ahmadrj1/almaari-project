import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "@/app/(auth)/register/register-client";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Mock useToast
const mockShowToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
    toasts: [],
    removeToast: jest.fn(),
  }),
}));

describe("RegisterPage Client Component Tests", () => {
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter = useRouter();
  });

  it("renders sign up form elements", () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /signup/i })).toBeInTheDocument();
  });

  it("shows validation errors for invalid fields on submit", async () => {
    render(<RegisterPage />);

    const form = screen
      .getByRole("button", { name: /signup/i })
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/full name must be at least 2 characters/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/enter a valid email address/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/enter a valid phone number/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument();
    });
  });

  it("shows validation error when passwords do not match", async () => {
    render(<RegisterPage />);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const phoneInput = screen.getByLabelText(/mobile/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const form = screen
      .getByRole("button", { name: /signup/i })
      .closest("form")!;

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "+1234567890" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmInput, {
      target: { value: "DifferentPassword1!" },
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue("John Doe");
      expect(passwordInput).toHaveValue("Password123!");
      expect(confirmInput).toHaveValue("DifferentPassword1!");
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("submits registration successfully and redirects to login", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ success: true, message: "Registration successful" }),
    };
    const fetchSpy = jest
      .spyOn(window, "fetch")
      .mockResolvedValue(mockResponse as any);

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const phoneInput = screen.getByLabelText(/mobile/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const form = screen
      .getByRole("button", { name: /signup/i })
      .closest("form")!;

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "+1234567890" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmInput, { target: { value: "Password123!" } });

    await waitFor(() => {
      expect(confirmInput).toHaveValue("Password123!");
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: "John Doe",
            email: "john@example.com",
            phone: "+1234567890",
            password: "Password123!",
            confirmPassword: "Password123!",
          }),
        }),
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "success",
        "Registration successful. Please login.",
      );
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });

    fetchSpy.mockRestore();
  });

  it("shows error if registration API returns failure", async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({ success: false, error: "Email already exists" }),
    };
    const fetchSpy = jest
      .spyOn(window, "fetch")
      .mockResolvedValue(mockResponse as any);

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const phoneInput = screen.getByLabelText(/mobile/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const form = screen
      .getByRole("button", { name: /signup/i })
      .closest("form")!;

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "+1234567890" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmInput, { target: { value: "Password123!" } });

    await waitFor(() => {
      expect(confirmInput).toHaveValue("Password123!");
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });

    fetchSpy.mockRestore();
  });
});
