import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { api } from "../lib/api"
import useAuthStore from "../store/authStore"

export default function useLogout() {
  const navigate = useNavigate()
  const setLogOut = useAuthStore((s) => s.setLogOut)

  return async () => {
    try {
      // Revokes the refresh token server-side; logout used to only delete a
      // cookie, leaving the token valid for anyone who had captured it.
      await api.logout()
    } catch {
      /* clearing local state matters more than the round trip succeeding */
    }
    setLogOut()
    toast.success("Signed out.")
    navigate("/login", { replace: true })
  }
}
