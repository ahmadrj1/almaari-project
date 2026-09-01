import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/forgot-password-client";

const mockShowToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
    toasts: [],
    removeToast: jest.fn(),
  }),
}));

describe("ForgotPasswordPage Client Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form elements", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /forgot password/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
  });

  it("shows validation error for invalid email on submit", async () => {
    render(<ForgotPasswordPage />);

    const form = screen
      .getByRole("button", { name: /forgot password/i })
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/enter a valid email address/i),
      ).toBeInTheDocument();
    });
  });

  it("submits successfully and shows success toast", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        success: true,
        message: "If user exists, an email will be sent with instructions.",
      }),
    };
    const fetchSpy = jest
      .spyOn(window, "fetch")
      .mockResolvedValue(mockResponse as any);

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });

    const form = emailInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/auth/forgot-password",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "success",
        "If user exists, an email will be sent with instructions.",
      );
    });

    // Email input should be cleared on success
    expect(emailInput).toHaveValue("");

    fetchSpy.mockRestore();
  });

  it("shows error toast on API failure", async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({ success: false, error: "Server error" }),
    };
    const fetchSpy = jest
      .spyOn(window, "fetch")
      .mockResolvedValue(mockResponse as any);

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });

    const form = emailInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("error", "Server error");
    });

    fetchSpy.mockRestore();
  });

  it("shows error toast on network failure", async () => {
    const fetchSpy = jest
      .spyOn(window, "fetch")
      .mockRejectedValue(new Error("Network error"));

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });

    const form = emailInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        "error",
        "Something went wrong.",
      );
    });

    fetchSpy.mockRestore();
  });
});
