"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";

interface CartCountContextValue {
  count: number;
  increment: () => void;
  decrement: () => void;
  setCount: (n: number) => void;
  refresh: () => void;
}

const CartCountContext = createContext<CartCountContextValue>({
  count: 0,
  increment: () => {},
  decrement: () => {},
  setCount: () => {},
  refresh: () => {},
});

export function CartCountProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") { setCount(0); return; }
    try {
      const res = await fetch("/api/cart/count");
      const data = await res.json();
      setCount(data.count ?? 0);
    } catch {}
  }, [status]);

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(); 
  }, [refresh]);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  return (
    <CartCountContext.Provider value={{ count, increment, decrement, setCount, refresh }}>
      {children}
    </CartCountContext.Provider>
  );
}

export function useCartCount() {
  return useContext(CartCountContext);
}
