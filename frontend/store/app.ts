import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserLocation {
  lat: number;
  lon: number;
  address?: string;
}

export type SelectedMode = "buyer" | "business";

interface AppState {
  location: UserLocation | null;
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
  toggleFavorite: (storeId: string) => void;
  setOnboardingDone: (done: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      location: null,
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
