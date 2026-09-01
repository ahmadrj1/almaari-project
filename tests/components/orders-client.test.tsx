import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import OrdersPage from "@/app/(main)/orders/orders-client";

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

// Mock useCartCount
const mockRefresh = jest.fn();
jest.mock("@/hooks/use-cart-count", () => ({
  useCartCount: () => ({ count: 0, refresh: mockRefresh }),
}));

// Mock useToast
const mockShowToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
    toasts: [],
    removeToast: jest.fn(),
  }),
}));

// Mock Pagination
jest.mock("@/components/ui/pagination", () => ({
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => (
    <div data-testid="pagination">
      <button onClick={() => onPageChange(currentPage + 1)}>Next</button>
      <span>
        {currentPage}/{totalPages}
      </span>
    </div>
  ),
}));

const mockOrder = {
  id: "abc12345-uuid-here",
  createdAt: new Date("2024-01-15").toISOString(),
  status: "PENDING",
  paymentMethod: "CASH_ON_DELIVERY",
  paymentStatus: "PENDING",
  total: "115.00",
  items: [],
};

const mockCardOrder = {
  ...mockOrder,
  id: "def67890-uuid-here",
  paymentMethod: "CREDIT_DEBIT_CARD",
  paymentStatus: "PAID",
  status: "DELIVERED",
};

describe("OrdersPage Client Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading spinner initially", () => {
    jest.spyOn(window, "fetch").mockImplementation(() => new Promise(() => {}));
    render(<OrdersPage />);
    expect(document.querySelector("svg") ?? document.querySelector('[class*="animate"]')).toBeTruthy();
  });

  it("shows empty state when no orders", async () => {
    jest.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { orders: [], pagination: { page: 1, totalPages: 0 } },
      }),
    } as Response);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
    });
  });

  it("renders order list when orders exist", async () => {
    jest.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          orders: [mockOrder],
          pagination: { page: 1, totalPages: 1 },
        },
      }),
    } as Response);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/my orders/i)).toBeInTheDocument();
      // Order ID is sliced to 8 chars and uppercased
      expect(screen.getByText("ABC12345")).toBeInTheDocument();
    });
  });

  it("renders PENDING status badge correctly", async () => {
    jest.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          orders: [mockOrder],
          pagination: { page: 1, totalPages: 1 },
        },
      }),
    } as Response);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("PENDING")).toBeInTheDocument();
    });
  });

  it("renders DELIVERED status and PAID payment badge for card order", async () => {
    jest.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          orders: [mockCardOrder],
          pagination: { page: 1, totalPages: 1 },
        },
      }),
    } as Response);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("DELIVERED")).toBeInTheDocument();
      expect(screen.getByText("PAID")).toBeInTheDocument();
    });
  });

  it("shows dash for COD payment method in payment column", async () => {
    jest.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          orders: [mockOrder],
          pagination: { page: 1, totalPages: 1 },
        },
      }),
    } as Response);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  it("shows error toast when fetch fails", async () => {
    jest.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, error: "Unauthorized" }),
    } as Response);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("error", "Failed to load orders");
    });
  });

  it("shows error toast on network error", async () => {
    jest.spyOn(window, "fetch").mockRejectedValue(new Error("Network error"));

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("error", "Failed to load orders");
    });
  });

  it("shows 'Order Again' button for CANCELLED orders", async () => {
    const cancelledOrder = {
      ...mockOrder,
      id: "cancelled1-uuid",
      status: "CANCELLED",
    };

    jest.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          orders: [cancelledOrder],
          pagination: { page: 1, totalPages: 1 },
        },
      }),
    } as Response);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /order again/i })).toBeInTheDocument();
    });
  });

  it("calls reorder API and redirects to cart on success", async () => {
    const cancelledOrder = {
      ...mockOrder,
      id: "cancelled1-uuid",
      status: "CANCELLED",
    };

    const mockRouter = require("next/navigation").useRouter();

    jest
      .spyOn(window, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            orders: [cancelledOrder],
            pagination: { page: 1, totalPages: 1 },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          addedCount: 2,
          skippedItems: [],
          adjustedItems: [],
        }),
      } as Response);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() =>
      screen.getByRole("button", { name: /order again/i }),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /order again/i }));
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("success", "Items added to cart.");
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/cart");
    });
  });

  it("shows 'out of stock' toast when reorder returns addedCount 0", async () => {
    const cancelledOrder = {
      ...mockOrder,
      id: "cancelled1-uuid",
      status: "CANCELLED",
    };

    jest
      .spyOn(window, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            orders: [cancelledOrder],
            pagination: { page: 1, totalPages: 1 },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          addedCount: 0,
          skippedItems: [],
          adjustedItems: [],
        }),
      } as Response);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() =>
      screen.getByRole("button", { name: /order again/i }),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /order again/i }));
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        "error",
        "Sorry, the item is now out of stock.",
      );
    });
  });

  it("fetches next page when pagination changes", async () => {
    const fetchSpy = jest.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          orders: [mockOrder],
          pagination: { page: 1, totalPages: 3 },
        },
      }),
    } as Response);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => screen.getByTestId("pagination"));

    await act(async () => {
      fireEvent.click(screen.getByText("Next"));
    });

    await waitFor(() => {
      // Should have called fetch twice (initial + page change)
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
