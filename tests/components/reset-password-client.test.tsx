import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "@/app/(auth)/reset-password/reset-password-client";
import { useRouter } from "next/navigation";

const mockShowToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
    toasts: [],
    removeToast: jest.fn(),
  }),
}));

describe("ResetPasswordPage Client Component Tests", () => {
  let mockRouter: ReturnType<typeof useRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter = useRouter();
  });

  it("renders form elements", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset password/i }),
    ).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty form", async () => {
    render(<ResetPasswordPage />);

    const form = screen
      .getByRole("button", { name: /reset password/i })
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument();
    });
  });

  it("shows error when passwords do not match", async () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Different123!" },
    });

    const form = screen
      .getByRole("button", { name: /reset password/i })
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("submits successfully, shows toast, and redirects to login", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        success: true,
        message: "Password reset successfully.",
      }),
    };
    const fetchSpy = jest
      .spyOn(window, "fetch")
      .mockResolvedValue(mockResponse as any);

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Password123!" },
    });

    const form = screen
      .getByRole("button", { name: /reset password/i })
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/auth/reset-password",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "success",
        "Password reset successfully.",
      );
      expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });

    fetchSpy.mockRestore();
  });

  it("shows error toast on API failure", async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({
        success: false,
        error: "Invalid or expired reset token.",
      }),
    };
    const fetchSpy = jest
      .spyOn(window, "fetch")
      .mockResolvedValue(mockResponse as any);

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Password123!" },
    });

    const form = screen
      .getByRole("button", { name: /reset password/i })
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        "error",
        "Invalid or expired reset token.",
      );
    });

    fetchSpy.mockRestore();
  });

  it("shows error toast on network failure", async () => {
    const fetchSpy = jest
      .spyOn(window, "fetch")
      .mockRejectedValue(new Error("Network error"));

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Password123!" },
    });

    const form = screen
      .getByRole("button", { name: /reset password/i })
      .closest("form")!;
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
