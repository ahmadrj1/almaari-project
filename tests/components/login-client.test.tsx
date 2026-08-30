import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/login-client";
import { useSession, signIn, getCsrfToken } from "next-auth/react";

// Mock useToast
const mockShowToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
    toasts: [],
    removeToast: jest.fn(),
  }),
}));

describe("LoginPage Client Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders login form items", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });

  it("shows validation errors for invalid fields on submit", async () => {
    render(<LoginPage />);

    const form = screen
      .getByRole("button", { name: /login/i })
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/enter a valid email address/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it("submits form successfully and calls window.location.assign", async () => {
    (getCsrfToken as jest.Mock).mockResolvedValue("csrf-token-123");

    const mockResponse = {
      ok: true,
      json: async () => ({
        url: "http://localhost/login/redirect?success=true",
      }),
    };
    const fetchSpy = jest
      .spyOn(window, "fetch")
      .mockResolvedValue(mockResponse as any);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    await waitFor(() => {
      expect(emailInput).toHaveValue("john@example.com");
      expect(passwordInput).toHaveValue("Password123!");
    });

    const form = emailInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/auth/callback/credentials",
        expect.any(Object),
      );
      expect(window.location.assign).toHaveBeenCalledWith(
        "http://localhost/login/redirect?success=true",
      );
    });

    fetchSpy.mockRestore();
  });

  it("shows error if API credentials authentication fails", async () => {
    (getCsrfToken as jest.Mock).mockResolvedValue("csrf-token-123");

    const mockResponse = {
      ok: true,
      json: async () => ({
        url: "http://localhost/login?error=CredentialsSignin",
      }),
    };
    const fetchSpy = jest
      .spyOn(window, "fetch")
      .mockResolvedValue(mockResponse as any);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    await waitFor(() => {
      expect(emailInput).toHaveValue("john@example.com");
      expect(passwordInput).toHaveValue("Password123!");
    });

    const form = emailInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email or password/i),
      ).toBeInTheDocument();
    });

    fetchSpy.mockRestore();
  });

  it("triggers Google sign in popup flow on Google button click", async () => {
    (signIn as jest.Mock).mockResolvedValue({ url: "http://google-auth-url" });
    window.open = jest.fn().mockReturnValue({ closed: false });

    render(<LoginPage />);

    const googleBtn = screen.getByText(/sign in with google/i);
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith(
        "google",
        expect.any(Object),
        expect.any(Object),
      );
    });
  });
});
