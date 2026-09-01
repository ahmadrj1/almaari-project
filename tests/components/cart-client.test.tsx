import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import CartPage from "@/app/(main)/cart/cart-client";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

// Mock useCartCount
const mockDecrement = jest.fn();
const mockRefresh = jest.fn();
jest.mock("@/hooks/use-cart-count", () => ({
  useCartCount: () => ({
    count: 2,
    decrement: mockDecrement,
    refresh: mockRefresh,
  }),
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

// Mock cloudinary util
jest.mock("@/lib/cloudinary", () => ({
  getOptimizedCloudinaryUrl: (url: string) => url,
}));

const mockCartItem = {
  id: "cart-item-1",
  quantity: 2,
  updatedAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  product: {
    id: "prod-1",
    title: "Test Shirt",
    price: "50.00",
    image: "https://example.com/shirt.jpg",
  },
  variant: {
    id: "var-1",
    stock: 10,
    color: { name: "Red", hexCode: "#FF0000" },
    size: { name: "M" },
  },
};

const mockAddress = {
  id: "addr-1",
  street: "123 Main St",
  city: "New York",
  zipCode: "10001",
  country: "US",
};

function mockFetch(responses: object[]) {
  let callCount = 0;
  jest.spyOn(window, "fetch").mockImplementation(() => {
    const response = responses[Math.min(callCount++, responses.length - 1)];
    return Promise.resolve({
      ok: true,
      json: async () => response,
    } as Response);
  });
}

describe("CartPage Client Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading spinner initially", () => {
    jest.spyOn(window, "fetch").mockImplementation(() => new Promise(() => {}));
    render(<CartPage />);
    // CartPage shows a Spinner (with animate-spin) during loading
    const spinnerContainer =
      document.querySelector('[class*="animate"]') ??
      screen.queryByRole("status");
    expect(spinnerContainer ?? document.querySelector("svg")).toBeTruthy();
  });

  it("renders cart items after fetch", async () => {
    mockFetch([
      { success: true, data: { items: [mockCartItem], adjustments: [] } },
    ]);

    await act(async () => {
      render(<CartPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Shirt")).toBeInTheDocument();
    });
  });

  it("shows empty state when cart has no items", async () => {
    mockFetch([{ success: true, data: { items: [], adjustments: [] } }]);

    await act(async () => {
      render(<CartPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });
  });

  it("opens address modal after successful cart validation", async () => {
    mockFetch([
      { success: true, data: { items: [mockCartItem], adjustments: [] } },
      { success: true, issues: [] },
      { success: true, data: [mockAddress] },
    ]);

    await act(async () => {
      render(<CartPage />);
    });

    await waitFor(() => screen.getByText("Test Shirt"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /delivery address/i }),
      ).toBeInTheDocument();
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });
  });

  it("shows stock issue modal when validation detects issues", async () => {
    mockFetch([
      { success: true, data: { items: [mockCartItem], adjustments: [] } },
      {
        success: true,
        issues: [
          {
            type: "reduced",
            cartItemId: "cart-item-1",
            title: "Test Shirt",
            color: "Red",
            size: "M",
            requested: 5,
            available: 2,
          },
        ],
      },
    ]);

    await act(async () => {
      render(<CartPage />);
    });

    await waitFor(() => screen.getByText("Test Shirt"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/stock availability issue/i)).toBeInTheDocument();
    });
  });

  it("places order successfully and shows success dialog", async () => {
    mockFetch([
      { success: true, data: { items: [mockCartItem], adjustments: [] } },
      { success: true, issues: [] },
      { success: true, data: [mockAddress] },
      { success: true, data: { id: "order-999" } },
    ]);

    jest.useFakeTimers({ advanceTimers: false });
    await act(async () => {
      render(<CartPage />);
    });

    await waitFor(() => screen.getByText("Test Shirt"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    });

    await waitFor(() =>
      screen.getByRole("heading", { name: /delivery address/i }),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirm order/i }));
    });

    // Advance the 1s delay inside handlePlaceOrder
    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByText(/order placed!/i)).toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});
