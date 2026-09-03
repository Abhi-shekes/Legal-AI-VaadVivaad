import { create } from "zustand"
import { persist } from "zustand/middleware"

/**
 * Auth state.
 *
 * `isLoggedIn` is persisted only so the first paint after a reload does not
 * flash the login page. It is NOT the source of truth: `useSession` revalidates
 * against /auth/me on mount, because the previous version trusted localStorage
 * forever and happily showed a signed-in UI while every API call returned 401.
 */
const useAuthStore = create(
  persist(
    (set) => ({
      isLoggedIn: false,
      role: null,
      user: null,
      // Until /auth/me answers we do not know; routes wait rather than guess.
      checked: false,

      setLogIn: (user, role = "user") =>
        set({ isLoggedIn: true, role, user, checked: true }),
      setLogOut: () => set({ isLoggedIn: false, role: null, user: null, checked: true }),
      setChecked: (checked) => set({ checked }),
    }),
    {
      name: "auth-storage",
      // `checked` is per-session state, not something to restore from disk.
      partialize: ({ isLoggedIn, role, user }) => ({ isLoggedIn, role, user }),
    }
  )
)

export default useAuthStore
