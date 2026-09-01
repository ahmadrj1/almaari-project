import "@testing-library/jest-dom";
import "jest-location-mock";

// Polyfill TextEncoder/TextDecoder if not present in the environment (needed for jose/next-auth in tests)
if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

if (typeof global.Request === "undefined") {
  global.Request = class {} as any;
  global.Response = class {} as any;
  global.Headers = class {} as any;
}

if (typeof global.fetch === "undefined") {
  global.fetch = jest.fn();
}
// @ts-ignore
if (typeof window !== "undefined") {
  window.fetch = global.fetch;
}

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();
const mockBack = jest.fn();
const mockGet = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
    back: mockBack,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
  usePathname: () => "",
}));

// Mock next-auth/react
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getCsrfToken: jest.fn(() => "mock-csrf-token"),
}));

// Mock cookies utility from next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock react-refresh to prevent issues with components using it in dev mode
jest.mock(
  "react-refresh",
  () => ({
    performReactRefresh: () => {},
    isReactRefreshBoundary: () => false,
  }),
  { virtual: true },
);
