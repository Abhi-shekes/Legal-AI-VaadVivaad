import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import useAuthStore from "../store/authStore"

/** Keeps signed-in users out of login/signup, once the session is known. */
export default function PublicRoute({ children }) {
  const { isLoggedIn, checked } = useAuthStore((s) => s)
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-brass" />
      </div>
    )
  }
  return isLoggedIn ? <Navigate to="/user/dashboard" replace /> : children
}
