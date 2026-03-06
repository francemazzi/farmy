import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  stockId: string;
  name: string;
  price: number;
  unitOfMeasure?: string;
  quantity: number;
  maxQuantity: number;
  imageUrl?: string;
}

interface CartState {
  companyId: string | null;
  items: CartItem[];
  addItem: (
    companyId: string,
    item: Omit<CartItem, "quantity"> & { quantity?: number },
  ) => void;
  removeItem: (stockId: string) => void;
  updateQuantity: (stockId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalAmount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      companyId: null,
      items: [],

      addItem: (companyId, item) => {
        const state = get();
        if (state.companyId && state.companyId !== companyId) {
          set({ companyId, items: [{ ...item, quantity: item.quantity ?? 1 }] });
          return;
        }

        const existing = state.items.find((i) => i.stockId === item.stockId);
        if (existing) {
          const newQty = Math.min(
            existing.quantity + (item.quantity ?? 1),
            item.maxQuantity,
          );
          set({
            companyId,
            items: state.items.map((i) =>
              i.stockId === item.stockId ? { ...i, quantity: newQty } : i,
            ),
          });
        } else {
          set({
            companyId,
            items: [...state.items, { ...item, quantity: item.quantity ?? 1 }],
          });
        }
      },

      removeItem: (stockId) =>
        set((s) => ({
          items: s.items.filter((i) => i.stockId !== stockId),
          companyId: s.items.length <= 1 ? null : s.companyId,
        })),

      updateQuantity: (stockId, quantity) =>
        set((s) => ({
          items:
            quantity <= 0
              ? s.items.filter((i) => i.stockId !== stockId)
              : s.items.map((i) =>
                  i.stockId === stockId
                    ? { ...i, quantity: Math.min(quantity, i.maxQuantity) }
                    : i,
                ),
        })),

      clearCart: () => set({ companyId: null, items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalAmount: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "farmy-cart" },
  ),
);
