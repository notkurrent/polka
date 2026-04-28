import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserLocation {
  lat: number;
  lon: number;
  address?: string;
}

export interface CartItem {
  offerId: string;
  partnerId: string;
  name: string;
  price: number;
  quantity: number;
  originalPrice?: number;
  storeName?: string;
  stock?: number;
}

export type SelectedMode = "buyer" | "business";

interface AppState {
  location: UserLocation | null;
  cart: CartItem[];
  favorites: string[];
  onboardingDone: boolean;
  selectedMode: SelectedMode | null;
  activeUserId: number | null;
  selectedModeByUser: Record<string, SelectedMode>;
  accountLinkPromptDismissed: boolean;
  accountCompletionPromptDismissed: boolean;
  setLocation: (loc: UserLocation) => void;
  activateUserMode: (userId: number) => void;
  deactivateUserMode: () => void;
  setSelectedMode: (mode: SelectedMode | null) => void;
  setSelectedModeForUser: (userId: number, mode: SelectedMode | null) => void;
  clearSelectedMode: () => void;
  dismissAccountLinkPrompt: () => void;
  dismissAccountCompletionPrompt: () => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (offerId: string) => void;
  clearCart: () => void;
  cartTotal: () => number;
  toggleFavorite: (storeId: string) => void;
  setOnboardingDone: (done: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      location: null,
      cart: [],
      favorites: [],
      onboardingDone: false,
      selectedMode: null,
      activeUserId: null,
      selectedModeByUser: {},
      accountLinkPromptDismissed: false,
      accountCompletionPromptDismissed: false,
      setLocation: (loc) => set({ location: loc }),
      setOnboardingDone: (done) => set({ onboardingDone: done }),
      activateUserMode: (userId) =>
        set((state) => ({
          activeUserId: userId,
          selectedMode: state.selectedModeByUser[String(userId)] ?? null,
        })),
      deactivateUserMode: () => set({ activeUserId: null, selectedMode: null }),
      setSelectedMode: (mode) =>
        set((state) => {
          const key = state.activeUserId == null ? null : String(state.activeUserId);
          if (!key) return { selectedMode: mode };
          const selectedModeByUser = { ...state.selectedModeByUser };
          if (mode) {
            selectedModeByUser[key] = mode;
          } else {
            delete selectedModeByUser[key];
          }
          return { selectedMode: mode, selectedModeByUser };
        }),
      setSelectedModeForUser: (userId, mode) =>
        set((state) => {
          const key = String(userId);
          const selectedModeByUser = { ...state.selectedModeByUser };
          if (mode) {
            selectedModeByUser[key] = mode;
          } else {
            delete selectedModeByUser[key];
          }
          return {
            activeUserId: userId,
            selectedMode: mode,
            selectedModeByUser,
          };
        }),
      clearSelectedMode: () =>
        set((state) => {
          const key = state.activeUserId == null ? null : String(state.activeUserId);
          if (!key) return { selectedMode: null };
          const selectedModeByUser = { ...state.selectedModeByUser };
          delete selectedModeByUser[key];
          return { selectedMode: null, selectedModeByUser };
        }),
      dismissAccountLinkPrompt: () => set({ accountLinkPromptDismissed: true }),
      dismissAccountCompletionPrompt: () => set({ accountCompletionPromptDismissed: true }),
      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((i) => i.offerId === item.offerId);
          if (existing) {
            return {
              cart: state.cart.map((i) =>
                i.offerId === item.offerId ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return { cart: [...state.cart, item] };
        }),
      removeFromCart: (offerId) =>
        set((state) => ({
          cart: state.cart.filter((i) => i.offerId !== offerId),
        })),
      clearCart: () => set({ cart: [] }),
      cartTotal: () => get().cart.reduce((total, item) => total + item.price * item.quantity, 0),
      toggleFavorite: (storeId) =>
        set((state) => {
          const favs = state.favorites;
          if (favs.includes(storeId)) {
            return { favorites: favs.filter((id) => id !== storeId) };
          }
          return { favorites: [...favs, storeId] };
        }),
    }),
    {
      name: "app-storage",
      partialize: (state) => ({
        favorites: state.favorites,
        cart: state.cart,
        onboardingDone: state.onboardingDone,
        selectedMode: state.selectedMode,
        activeUserId: state.activeUserId,
        selectedModeByUser: state.selectedModeByUser,
        accountLinkPromptDismissed: state.accountLinkPromptDismissed,
        accountCompletionPromptDismissed: state.accountCompletionPromptDismissed,
      }),
    },
  ),
);
